import { Connection, Types, ClientSession } from 'mongoose';
import httpStatus from 'http-status';
import { AppError } from '@app/classes/AppError';
import { TBrand } from '../auth/auth.interface';
import { getOrderModel } from './Order.model';
import { generateDateBasedOrderNumber } from './Order.utils';
import { getGroupBuyModel } from '../GroupBuy-Related/GroupBuy/GroupBuy.model';
import { getProductModel } from '../products/product.model';
import { IProductVariant } from '../products/product.interface';
import { IAddress, IOrderTimelineEvent } from './Order.interface';
import { roundTwoDecimals } from '../Payment-Related/Transaction/Transaction.utils';
import { PaymentServices } from '../Payment-Related/Payment/Payment.service';
import { CartKey } from '../Cart/Cart.interface';
import { calculateGroupBuyLivePrice } from '../GroupBuy-Related/GroupBuy/GroupBuy.utils';
import { OrderRelatedEmails } from './Order.email';
import crypto from 'crypto';

export const OrderGroupBuyService = (connection: Connection, storePreference: TBrand) => {
  const OrderModel = getOrderModel(connection);
  const GroupBuyModel = getGroupBuyModel(connection);
  const ProductModel = getProductModel(connection);

  /**
   * JOIN GROUP BUY CAMPAIGN
   * Handles the intent and commitment phase for dynamic deals.
   */
  const joinGroupBuyCampaign = async (
    key: CartKey,
    payload: {
      campaignId: Types.ObjectId;
      shippingAddress: IAddress;
      email: string;
      gateway: 'amarpay' | 'stripe';
      quantity?: number;
    },
  ) => {
    // 1. Fetch Campaign and validate ACTIVE status
    const campaign = await GroupBuyModel.findById(payload.campaignId).lean();
    if (!campaign || campaign.status !== 'ACTIVE') {
      throw new AppError('This deal is currently not accepting new members.', httpStatus.GONE);
    }

    const buyQuantity = payload.quantity || 1;

    // GUARD A: Per-User Limit
    if (campaign.maxLimitPerUser != null && buyQuantity > campaign.maxLimitPerUser) {
      throw new AppError(
        `Max limit exceeded! You can only buy ${campaign.maxLimitPerUser} per person.`,
        httpStatus.BAD_REQUEST,
      );
    }

    // GUARD B: Global Inventory Capacity
    if (campaign.maxTotalCapacity != null) {
      const remaining = campaign.maxTotalCapacity - campaign.totalQuantityOrdered;
      if (buyQuantity > remaining) {
        throw new AppError(`Stock low! Only ${remaining} units remaining.`, httpStatus.BAD_REQUEST);
      }
    }

    // 2. Product Fetch
    const product = await ProductModel.findById(campaign.productId).select('variants bookingConfiguration').lean();

    if (!product) throw new AppError('Product reference missing.', httpStatus.NOT_FOUND);

    // 3. Variant Match to extract dynamic fulfillment logic
    const variant = product.variants.find((v: IProductVariant) => v.sku === campaign.variantSku);
    if (!variant) throw new AppError('Selected variant is no longer available.', httpStatus.NOT_FOUND);

    const session: ClientSession = await connection.startSession();
    try {
      session.startTransaction();

      const buyQuantity = payload.quantity || 1;
      const subtotal = roundTwoDecimals(campaign.basePrice * buyQuantity);
      const total = subtotal; // GroupBuy discounts are applied during the Settlement Phase, not Join Phase.

      const orderNumber = `GBY-${generateDateBasedOrderNumber()}`;
      const cancelToken = crypto.randomBytes(32).toString('hex');

      const orderData = {
        orderNumber,
        storePreference,
        user: key.user ? new Types.ObjectId(key.user) : undefined,
        guestId: key.guestId,
        email: payload.email,
        orderType: 'group-buy',
        fulfillmentStatus: 'group-buy-pending',

        items: [
          {
            product: campaign.productId,
            groupBuyId: campaign._id,
            isGroupBuyItem: true,
            sku: campaign.variantSku,
            quantity: buyQuantity,
            priceAtPurchase: campaign.basePrice,
            fulfillmentType: variant.fulfillmentType || 'READY_TO_SHIP',
          },
        ],

        subtotal,
        total,

        paymentInfo: {
          paymentType: 'partial',
          paidAmount: 0,
          dueAmount: total,
          bookingPercentageAtPurchase: product.bookingConfiguration?.bookingFeePercentage ?? 10,
        },

        shippingAddress: payload.shippingAddress,
        orderHistory: [
          {
            status: 'group-buy-pending',
            title: 'Joined Group Deal',
            description: `Successfully joined "${campaign.campaignTitle}" at a base price of ৳${campaign.basePrice}. Your final price will reduce as more members join!`,
            timestamp: new Date(),
          },
        ],
        cancelToken,
      };

      const orders = await OrderModel.create([orderData], { session });
      const createdOrder = orders[0];

      await session.commitTransaction();
      // taking payment to confirm the joining of group buy
      const service = PaymentServices(connection, storePreference as TBrand);
      // Redirecting user to payment immediately after order creation
      const paymentInitPayload = { orderNumber: createdOrder.orderNumber, type: 'partial' as const };

      const paymentResult =
        payload.gateway === 'stripe'
          ? await service.StripePayInit(paymentInitPayload)
          : await service.AmarPayInit(paymentInitPayload);

      return {
        order: createdOrder,
        paymentUrl: paymentResult.paymentUrl, // Return this to frontend for redirect
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  };

  /**
   * CRON ENGINE: Finalizes an ended campaign.
   * This locks the price and prepares participants for the Settlement Phase.
   */
  const finalizeGroupBuyCampaign = async (campaignId: string | Types.ObjectId) => {
    const session = await connection.startSession();

    try {
      session.startTransaction();

      // 1. Fetch & Lock Campaign
      const campaign = await GroupBuyModel.findById(campaignId).session(session);
      if (!campaign || campaign.status === 'ENDED') {
        throw new Error('Campaign not found or already finalized.');
      }

      // 2. Lock the Final Price
      const finalPrice = calculateGroupBuyLivePrice(campaign.toObject(), campaign.totalPaidParticipants);
      campaign.status = 'ENDED';
      campaign.currentLivePrice = finalPrice;
      await campaign.save({ session });

      // 3. Process Paid Winners (Bulk Update)
      const confirmedOrders = await OrderModel.find({
        'items.groupBuyId': campaign._id,
        fulfillmentStatus: 'confirmed',
      })
        .session(session)
        .select('_id items paymentInfo');

      if (confirmedOrders.length > 0) {
        const winnerOps = confirmedOrders.map((order) => {
          const buyItem = order.items.find((i) => i.groupBuyId?.toString() === campaign._id.toString());
          const newTotal = roundTwoDecimals(finalPrice * (buyItem?.quantity || 1));
          const newDueAmount = roundTwoDecimals(newTotal - order.paymentInfo.paidAmount);

          return {
            updateOne: {
              filter: { _id: order._id },
              update: {
                $set: {
                  total: newTotal,
                  'paymentInfo.dueAmount': newDueAmount,
                  'items.$[elem].priceAtPurchase': finalPrice,
                },
                $push: {
                  orderHistory: {
                    status: 'confirmed',
                    title: 'Deal Finalized | Price Locked',
                    description: `Success! Final price: ৳${finalPrice}. Balance due: ৳${newDueAmount}.`,
                    timestamp: new Date(),
                  } as IOrderTimelineEvent,
                },
              },
              arrayFilters: [{ 'elem.groupBuyId': campaign._id }],
            },
          };
        });
        await OrderModel.bulkWrite(winnerOps, { session });
      }

      // 4. CAMPAIGN CLEANUP: Handle Unpaid/Pending Joins
      // We cancel these immediately as soon as the campaign ends
      await OrderModel.updateMany(
        {
          'items.groupBuyId': campaign._id,
          fulfillmentStatus: 'group-buy-pending',
        },
        {
          $set: { fulfillmentStatus: 'cancelled' },
          $push: {
            orderHistory: {
              status: 'cancelled',
              title: 'Campaign Ended',
              description: 'This spot was not secured before the campaign ended.',
              timestamp: new Date(),
            } as IOrderTimelineEvent,
          },
        },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      // 5. Post-Commit Notifications
      confirmedOrders.forEach((order) => {
        OrderRelatedEmails.sendOrderStatusUpdateEmail(
          order,
          ProductModel,
          connection,
          'Final Balance Due',
          `The deal ended! Your final price is ৳${finalPrice}. View your tracking page to settle the balance.`,
        );
      });

      return { success: true, finalPrice, participants: campaign.totalPaidParticipants };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  };

  const finalizeEndedGroupBuys = async () => {
    const now = new Date();

    // Find campaigns that are past their end date but still marked 'ACTIVE'
    const expiredCampaigns = await GroupBuyModel.find({
      endDate: { $lte: now },
      status: 'ACTIVE',
    }).select('_id');

    if (expiredCampaigns.length === 0) return { finalizedCount: 0 };

    // Process all found campaigns in parallel
    const results = await Promise.all(
      expiredCampaigns.map(async (camp) => {
        try {
          return await finalizeGroupBuyCampaign(camp._id);
        } catch (err) {
          console.error(`❌ [${storePreference}] Finalization failed for ${camp._id}:`, err);
          return null;
        }
      }),
    );

    return {
      finalizedCount: results.filter((r) => r !== null).length,
    };
  };
  return {
    joinGroupBuyCampaign,
    finalizeEndedGroupBuys,
  };
};
