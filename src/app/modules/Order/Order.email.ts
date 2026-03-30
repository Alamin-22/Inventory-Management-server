/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendEmail } from '@utils/sendEmail';
import { IOrder, IOrderItem } from './Order.interface';
import { config } from '@config/env';
import { TBrand } from '../auth/auth.interface';
import { TProductModel } from '../products/product.model';
import {
  AbandonedCartEmailParams,
  AdminNewOrderEmailParams,
  OrderConfirmedEmailParams,
  OrderStatusUpdateEmailParams,
  OrderSubmittedEmailParams,
  PreOrderConfirmedEmailParams,
} from '@app/Email_Templates/Order-Related/oder.email.interface';
import OrderSubmittedConfirmation from '@app/Email_Templates/Order-Related/OrderSubmittedConfirmation';
import AdminNewOrderNotification from '@app/Email_Templates/Order-Related/AdminNewOrderNotification';
import OrderConfirmedEmail from '@app/Email_Templates/Order-Related/OrderConfirmedEmail';
import PreOrderConfirmedEmail from '@app/Email_Templates/Order-Related/PreOrderConfirmedEmail';
import OrderExpiredEmail from '@app/Email_Templates/Order-Related/OrderExpiredEmail';
import AbandonedCartEmail from '@app/Email_Templates/Order-Related/AbandonedCartEmail';
import OrderStatusUpdateEmail from '@app/Email_Templates/Order-Related/OrderStatusUpdateEmail';
import { calculatePayableAmount } from '../Payment-Related/Payment/Payment.utils';
import PaymentReminderEmail from '@app/Email_Templates/Payment-Related/ReminderToCheckoutEmail';
import { Connection } from 'mongoose';
import { getGroupBuyModel } from '../GroupBuy-Related/GroupBuy/GroupBuy.model';

// Helper to get branding based on store
export const getBrandConfig = (storePreference: TBrand) => {
  const brandConfig = config.client[storePreference];
  const brandColors: Record<string, string> = {
    bringByAir: '#ff7043',
    pandaBD: '#2563eb',
  };

  return {
    companyName: brandConfig.companyName,
    companyLogoUrl: brandConfig.logoUrl,
    supportEmail: `support@${brandConfig.domain}`,
    supportPhone: '+8801733843279',
    clientUrl: brandConfig.url,
    adminEmails: brandConfig.adminEmails,
    themeColor: brandColors[storePreference] || '#ff7043',
  };
};

/**
 * Optimized: Fetches all products in a single batch query.
 */
export const _prepareItemsForEmail = async (orderItems: IOrderItem[], ProductModel: TProductModel) => {
  if (!orderItems?.length) return [];

  // 1. Collect all unique Product ObjectIDs
  const productIds = [...new Set(orderItems.map((item) => item.product.toString()))];

  // 2. Single Batch Query: Fetch all products in one trip
  const products = await ProductModel.find({
    _id: { $in: productIds },
  })
    .lean()
    .exec();

  // 3. Create a Map for O(1) lookup speed
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // 4. Map the original orderItems to the format expected by your Email Templates
  const itemsForEmail = orderItems.map((oi) => {
    const productIdStr = oi.product.toString();
    const productDoc: any = productMap.get(productIdStr);

    if (!productDoc) {
      return {
        sku: oi.sku,
        title: 'Product Unavailable', // Graceful fallback if product was deleted
        quantity: oi.quantity,
        price: oi.priceAtPurchase,
        imageUrl: '',
      };
    }

    const title = productDoc.title ?? oi.sku;
    const variant = productDoc.variants?.find((v: any) => v.sku === oi.sku);

    // Asset Priority: Variant-specific image > Main product gallery
    let imageUrl = '';
    if (variant?.image?.url) {
      imageUrl = variant.image.url;
    } else if (productDoc.images?.[0]?.url) {
      imageUrl = productDoc.images[0].url;
    }

    return {
      sku: oi.sku,
      title,
      quantity: oi.quantity,
      price: oi.priceAtPurchase,
      imageUrl,
    };
  });

  return itemsForEmail;
};

const sendPendingOrderNotifications = async (order: IOrder, ProductModel: TProductModel) => {
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, adminEmails, themeColor } =
    getBrandConfig(order.storePreference);

  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);
  const customerName = order.shippingAddress?.name ?? 'Valued Customer';
  const viewerId = order.user ? order.user.toString() : order.guestId;

  // --- LOGICAL CHECK BASED ON VARIANT FULFILLMENT ---
  let hasCrossBorderItem = false;

  for (const item of order.items) {
    const productDoc = await ProductModel.findById(item.product).lean();
    if (!productDoc) continue;

    // We check the specific variant fulfillment type
    const variant = productDoc.variants.find((v) => v.sku === item.sku);
    if (variant?.fulfillmentType === 'CROSS_BORDER') {
      hasCrossBorderItem = true;
      break;
    }
  }

  // Instruction and Admin Tag based purely on fulfillment logic
  const instructionNote = hasCrossBorderItem
    ? 'Your order contains Cross-Border items. Our team is currently reviewing the sourcing and logistics details. We will notify you once verified and cleared for the booking payment'
    : 'Your order has been submitted and is currently under admin review. We will notify you shortly once it is cleared for the booking payment.';

  const adminPriorityTag = hasCrossBorderItem ? '🌐 CROSS-BORDER REVIEW' : '📦 MANUAL REVIEW';

  const emailParams: OrderSubmittedEmailParams = {
    customerName,
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId!,
    userEmail: order.email!,
    createdAt: order.createdAt!,
    items: itemsForEmail,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    total: order.total,
    shippingAddress: order.shippingAddress!,
    supportEmail,
    supportPhone,
    companyName,
    companyLogoUrl,
    orderTrackingLink: `${clientUrl}/checkout/track_order_details/${order.orderNumber}/${viewerId}`,
    themeColor,
  };

  // 1. Send to User
  const subject = `[${companyName}] Order Received (Pending Review): ${order.orderNumber}`;
  const htmlContent = OrderSubmittedConfirmation({
    ...emailParams,
    overrideNoteHtml: instructionNote,
  } as any);

  sendEmail(order.email!, subject, htmlContent, order.storePreference).catch(console.error);

  // 2. Admin Notification
  const adminDashboardLink = `${clientUrl}/admin_dashboard_private/orders/details/${order._id}`;
  const adminEmailParams: AdminNewOrderEmailParams = {
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId!,
    customerName,
    orderDate: order.createdAt!,
    total: order.total,
    itemCount: order.items.length,
    adminDashboardLink,
    companyName,
    companyLogoUrl,
    themeColor,
  };

  const adminSubject = `[${adminPriorityTag}] New Order - ${order.orderNumber}`;
  sendEmail(adminEmails, adminSubject, AdminNewOrderNotification(adminEmailParams), order.storePreference).catch(
    console.error,
  );
};

const sendProcessingOrderNotifications = async (order: IOrder, ProductModel: TProductModel) => {
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, adminEmails, themeColor } =
    getBrandConfig(order.storePreference);

  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);
  const customerName = order.shippingAddress?.name ?? 'Valued Customer';
  const viewerId = order.user ? order.user.toString() : order.guestId;

  // --- UNIFIED CALCULATION LOGIC ---
  const minAmountToPay = calculatePayableAmount(order.total, order.paymentInfo);

  const paymentInstruction = `To confirm your order and begin processing, a <strong>Minimum Booking Deposit of ৳${minAmountToPay.toLocaleString()}</strong> is required. You can pay this now to secure your items.`;

  const confirmOrderEmailParams: OrderConfirmedEmailParams = {
    customerName,
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId!,
    createdAt: order.createdAt!,
    items: itemsForEmail,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    customDiscountAmount: order.customDiscountAmount || 0,
    taxAmount: order.tax || 0,
    shippingFee: order.shippingFee || 0,
    total: order.total,
    minAmountToPay,
    overrideNoteHtml: paymentInstruction,
    shippingAddress: order.shippingAddress!,
    supportEmail,
    supportPhone,
    userEmail: order.email!,
    companyName,
    companyLogoUrl,
    paymentUrl: `${clientUrl}/checkout/payment/${order.orderNumber}/${viewerId}`,
    cancelLink: `${clientUrl}/cancel_order?order_Number=${order.orderNumber}&token=${order.cancelToken}`,
    themeColor,
  };

  const subject = `[${companyName}] Order Verified – Awaiting Booking Deposit: ${order.orderNumber}`;
  const htmlContent = OrderConfirmedEmail(confirmOrderEmailParams);
  sendEmail(order.email!, subject, htmlContent, order.storePreference).catch(console.error);

  // Admin Notification
  const adminDashboardLink = `${clientUrl}/admin_dashboard_private/orders/details/${order._id}`;
  const adminEmailParams: AdminNewOrderEmailParams = {
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId!,
    customerName,
    orderDate: order.createdAt!,
    total: order.total,
    itemCount: order.items.length,
    adminDashboardLink,
    companyName,
    companyLogoUrl,
  };
  const adminSubject = `[${companyName}] Awaiting Payment: ${order.orderNumber}`;
  sendEmail(adminEmails, adminSubject, AdminNewOrderNotification(adminEmailParams), order.storePreference).catch(
    console.error,
  );
};

const sendPreOrderConfirmationNotifications = async (order: IOrder, ProductModel: TProductModel) => {
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, adminEmails, themeColor } =
    getBrandConfig(order.storePreference);

  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);
  const customerName = order.shippingAddress?.name ?? 'Valued Customer';
  const viewerId = order.user ? order.user.toString() : order.guestId;

  // Fetch the specific variant to get the delivery estimate
  const orderedProduct = await ProductModel.findById(order.items[0].product).lean();
  const orderedVariant = orderedProduct?.variants.find((v) => v.sku === order.items[0].sku);
  const releaseDate = orderedVariant?.deliveryEstimate || 'TBA';

  // --- SYNCED CALCULATION LOGIC ---
  const minAmountToPay = calculatePayableAmount(order.total, order.paymentInfo);

  const preOrderEmailParams: PreOrderConfirmedEmailParams = {
    customerName,
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId!,
    createdAt: order.createdAt!,
    items: itemsForEmail,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    total: order.total,
    minAmountToPay,
    releaseDate,
    shippingAddress: order.shippingAddress!,
    supportEmail,
    supportPhone,
    userEmail: order.email!,
    companyName,
    companyLogoUrl,
    paymentUrl: `${clientUrl}/checkout/payment/${order.orderNumber}/${viewerId}`,
    cancelLink: `${clientUrl}/cancel_order?order_Number=${order.orderNumber}&token=${order.cancelToken}`,
    themeColor,
    overrideNoteHtml: '',
    taxAmount: order.tax || 0,
    shippingFee: order.shippingFee || 0,
    customDiscountAmount: order.customDiscountAmount || 0,
  };

  const subject = `[${companyName}] Pre-Order Confirmed (Action Required): ${order.orderNumber}`;
  const htmlContent = PreOrderConfirmedEmail(preOrderEmailParams);

  sendEmail(order.email!, subject, htmlContent, order.storePreference);

  // Admin Notification
  const adminDashboardLink = `${clientUrl}/admin_dashboard_private/orders/details/${order._id}`;
  const adminEmailParams: AdminNewOrderEmailParams = {
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId!,
    customerName,
    orderDate: order.createdAt!,
    total: order.total,
    itemCount: order.items.length,
    adminDashboardLink,
    companyName,
    companyLogoUrl,
  };
  const adminSubject = `[${companyName}] 🚨 NEW PRE-ORDER: ${order.orderNumber}`;
  const adminHtml = AdminNewOrderNotification(adminEmailParams);
  sendEmail(adminEmails, adminSubject, adminHtml, order.storePreference).catch(console.error);
};

const sendAdminConfirmationEmail = async (order: IOrder, ProductModel: TProductModel, overrideNoteHtml: string) => {
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, themeColor } = getBrandConfig(
    order.storePreference,
  );
  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);
  const customerName = order.shippingAddress?.name ?? 'Valued Customer';
  const viewerId = order.user ? order.user.toString() : order.guestId!;

  // SYNCED CALCULATION
  const minAmountToPay = calculatePayableAmount(order.total, order.paymentInfo);

  const confirmOrderEmailParams: OrderConfirmedEmailParams = {
    customerName,
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId,
    createdAt: order.createdAt!,
    items: itemsForEmail,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    customDiscountAmount: order.customDiscountAmount || 0,
    taxAmount: order.tax || 0,
    shippingFee: order.shippingFee || 0,
    total: order.total,
    minAmountToPay,
    overrideNoteHtml,
    shippingAddress: order.shippingAddress!,
    supportEmail,
    supportPhone,
    userEmail: order.email!,
    companyName,
    companyLogoUrl,
    cancelLink: `${clientUrl}/cancel_order?order_Number=${order.orderNumber}&token=${order.cancelToken}`,
    paymentUrl: `${clientUrl}/checkout/payment/${order.orderNumber}/${viewerId}`,
    themeColor,
  };

  const subject = `[${companyName}] Order Confirmed: ${order.orderNumber}`;
  const htmlContent = OrderConfirmedEmail(confirmOrderEmailParams);
  sendEmail(order.email!, subject, htmlContent, order.storePreference);
};

const sendReorderConfirmationEmail = async (order: IOrder, ProductModel: TProductModel) => {
  const overrideNoteHtml = `This order was previously abandoned and has now been successfully re-confirmed. To finalize your order, please complete the booking deposit payment.`;
  await sendAdminConfirmationEmail(order, ProductModel, overrideNoteHtml);
};

const sendPaymentReminder = async (order: IOrder, ProductModel: TProductModel): Promise<void> => {
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, themeColor } = getBrandConfig(
    order.storePreference,
  );

  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);
  const customerName = order.shippingAddress?.name ?? 'Valued Customer';
  const viewerId = order.user ? order.user.toString() : order.guestId!;

  const amountToPay = calculatePayableAmount(order.total, order.paymentInfo);

  const isInitialDeposit = order.paymentInfo.paidAmount === 0;

  // 2. Prepare Dynamic Instructions based on the payment state
  const instructionTitle = isInitialDeposit ? 'Booking Fee Required' : 'Remaining Balance Due';

  const instructionNote = isInitialDeposit
    ? `To confirm your order and begin processing, a minimum booking fee of <strong>৳${amountToPay.toLocaleString()}</strong> is required. Please pay within the time limit to prevent cancellation.`
    : `Your order is confirmed and processing! This is a friendly reminder to pay your remaining balance of <strong>৳${amountToPay.toLocaleString()}</strong>.`;

  const emailData = {
    customerName,
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId,
    createdAt: order.createdAt!,
    items: itemsForEmail,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    customDiscountAmount: order.customDiscountAmount || 0,
    taxAmount: order.tax || 0,
    shippingFee: order.shippingFee || 0,
    total: order.total,
    minAmountToPay: amountToPay, // This now reflects the dynamic 10-50% or the remaining due
    paidAmount: order.paymentInfo.paidAmount,
    dueAmount: order.paymentInfo.dueAmount,
    shippingAddress: order.shippingAddress!,
    supportEmail,
    supportPhone,
    userEmail: order.email!,
    companyName,
    companyLogoUrl,
    cancelLink: `${clientUrl}/cancel_order?order_Number=${order.orderNumber}&token=${order.cancelToken}`,
    checkOutLink: `${clientUrl}/checkout/payment/${order.orderNumber}/${viewerId}`,
    expiryDate: order.orderExpireAt ?? new Date(),
    themeColor,
    overrideNoteHtml: instructionNote,
  };

  const subject = `[${companyName}] ${instructionTitle}: Order #${order.orderNumber}`;

  const htmlContent = PaymentReminderEmail(emailData as any);

  await sendEmail(order.email!, subject, htmlContent, order.storePreference);
};

const sendOrderExpiredEmail = async (order: IOrder, ProductModel: TProductModel): Promise<void> => {
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, themeColor } = getBrandConfig(
    order.storePreference,
  );

  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);
  const customerName = order.shippingAddress?.name ?? 'Valued Customer';
  const viewerId = order.user ? order.user.toString() : order.guestId!;

  const emailParams = {
    customerName,
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId,
    createdAt: order.createdAt!,
    items: itemsForEmail,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    customDiscountAmount: order.customDiscountAmount || 0,
    taxAmount: order.tax || 0,
    shippingFee: order.shippingFee || 0,
    total: order.total,
    paidAmount: order.paymentInfo.paidAmount,
    dueAmount: order.paymentInfo.dueAmount,
    shippingAddress: order.shippingAddress!,
    supportEmail,
    supportPhone,
    userEmail: order.email!,
    companyName,
    companyLogoUrl,
    expiryDate: order.orderExpireAt ?? new Date(),
    reorderLink: `${clientUrl}/reorder/${order.orderNumber}/${viewerId}`,
    themeColor,
  };

  const subject = `[${companyName}] Order Expired: #${order.orderNumber}`;

  const htmlContent = OrderExpiredEmail(emailParams as any);

  await sendEmail(order.email!, subject, htmlContent, order.storePreference);
};

const sendAbandonedReminderEmail = async (order: IOrder, ProductModel: TProductModel) => {
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, themeColor } = getBrandConfig(
    order.storePreference,
  );

  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);

  // --- SYNCED LOGIC: Calculate the deposit required to restart the order ---
  const minAmountToPay = calculatePayableAmount(order.total, order.paymentInfo);

  const emailParams: AbandonedCartEmailParams & {
    customDiscountAmount: number;
    minAmountToPay: number;
    paidAmount: number;
    dueAmount: number;
  } = {
    customerName: order.shippingAddress?.name ?? 'Valued Customer',
    orderNumber: order.orderNumber,
    createdAt: order.createdAt!,
    items: itemsForEmail,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    customDiscountAmount: order.customDiscountAmount || 0,
    taxAmount: order.tax || 0,
    shippingFee: order.shippingFee || 0,
    total: order.total,

    // --- FINANCIAL LEDGER DATA ---
    minAmountToPay, //  Shows them they only need a deposit to come back
    paidAmount: order.paymentInfo.paidAmount,
    dueAmount: order.paymentInfo.dueAmount,

    checkoutLink: `${clientUrl}/re_order?order_Number=${order.orderNumber}`,
    supportEmail,
    supportPhone,
    userEmail: order.email!,
    companyName,
    companyLogoUrl,
    themeColor,
  };

  const subject = `[${companyName}] Your Items Are Still Waiting! (Order #${order.orderNumber})`;

  const htmlContent = AbandonedCartEmail(emailParams as any);

  await sendEmail(order.email!, subject, htmlContent, order.storePreference);
};
// done

const sendOrderStatusUpdateEmail = async (
  order: IOrder,
  ProductModel: TProductModel,
  connection: Connection,
  updateTitle: string,
  updateMessage: string,
) => {
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, themeColor } = getBrandConfig(
    order.storePreference,
  );

  const GroupBuyModel = getGroupBuyModel(connection);
  const viewerId = order.user ? order.user.toString() : order.guestId!;
  const orderTrackingLink = `${clientUrl}/checkout/track_order_details/${order.orderNumber}/${viewerId}`;

  let itemsForEmail: any[] = [];
  let customUpdateMessage = updateMessage;

  /**
   * BRANCH A: Group Buy Context
   * We pull data from the Campaign and the Order Items snapshot, NOT the live shop price.
   */
  if (order.orderType === 'group-buy') {
    const groupBuyItem = order.items.find((item) => item.isGroupBuyItem);
    const campaign = await GroupBuyModel.findById(groupBuyItem?.groupBuyId).lean();

    if (campaign) {
      // Map the items manually to ensure we show the Baseline Price and Campaign Title
      itemsForEmail = order.items.map((item) => ({
        title: campaign.campaignTitle,
        sku: item.sku,
        quantity: item.quantity,
        price: item.priceAtPurchase, // Use the price locked during Join
        imageUrl: campaign.productReference?.variants?.find((v: any) => v.sku === item.sku)?.image?.url || '',
      }));

      // Enrich the message with dynamic campaign status
      customUpdateMessage = `
        ${updateMessage}
        <br/><br/>
        <strong>Your Collective Power Snapshot:</strong><br/>
        • <b>Joined at Baseline:</b> ৳${campaign.basePrice}<br/>
        • <b>Current Group Price:</b> ৳${campaign.currentLivePrice}<br/>
        • <b>Members Strong:</b> ${campaign.totalPaidParticipants}
        <br/><br/>
        The final price will be locked once the timer ends. Share the link below to drop the price further!
      `;
    }
  } else {
    /**
     * BRANCH B: Standard / Pre-Order Context
     */
    itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);
  }

  const emailParams: OrderStatusUpdateEmailParams = {
    customerName: order.shippingAddress?.name ?? 'Valued Customer',
    orderNumber: order.orderNumber,
    userOrGuestId: viewerId,
    items: itemsForEmail,
    updateTitle,
    updateMessage: customUpdateMessage,
    companyName,
    companyLogoUrl,
    supportEmail,
    supportPhone,
    orderTrackingLink,
    themeColor,
  };

  const subject = `[${companyName}] Order #${order.orderNumber} Update: ${updateTitle}`;
  const htmlContent = OrderStatusUpdateEmail(emailParams);

  await sendEmail(order.email!, subject, htmlContent, order.storePreference);
};

export const OrderRelatedEmails = {
  sendPendingOrderNotifications,
  sendProcessingOrderNotifications,
  sendAdminConfirmationEmail,
  sendReorderConfirmationEmail,
  sendOrderExpiredEmail,
  sendPaymentReminder,
  sendAbandonedReminderEmail,
  sendPreOrderConfirmationNotifications,
  sendOrderStatusUpdateEmail,
};
