import { ClientSession } from 'mongoose';
import { IOrderItem } from './Order.interface';
import { TProductModel } from '../products/product.model';
import { AppError } from '@app/classes/AppError';
import httpStatus from 'http-status';
import { PRODUCT_FULFILLMENT_TYPE, PRODUCT_STATUS } from '../products/product.constants';
import { config } from '@config/env';
import { sendEmail } from '@utils/sendEmail';
import { TBrand } from '../auth/auth.interface';
import { PopulatedCart } from '../Cart/Cart.interface';
import OutOfStockNotification from '@app/Email_Templates/Product-Related/OutOfStockNotification';
import LowStockNotification from '@app/Email_Templates/Product-Related/LowStockNotification';

export const generateDateBasedOrderNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const datePart = `${year}${month}${day}`;

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${datePart}-${randomPart}`;
};

/**
 * Validates cart items, Prevents Mixed Carts, and prepares Clean Order Items.
 */
export const _processCartItems = async (cart: PopulatedCart, ProductModel: TProductModel) => {
  let subtotal = 0;
  const initialOrderItems: IOrderItem[] = [];

  // Track types to prevent mixing
  let hasReadyToShip = false;
  let hasCrossBorder = false;

  for (const item of cart.items) {
    const productDoc = await ProductModel.findOne(
      {
        'variants.sku': item.sku,
        isPublished: true, // Prevent checkout of drafted items
        status: PRODUCT_STATUS.Active,
      },
      { _id: 1, title: 1, defaultPriceBDT: 1, 'variants.$': 1 },
    );

    if (!productDoc || !productDoc.variants.length) {
      throw new AppError(`A product in your cart (${item.sku}) is no longer available.`, httpStatus.BAD_REQUEST);
    }

    const variant = productDoc.variants[0];

    if (variant.launchDate) {
      const now = new Date();
      const launchTime = new Date(variant.launchDate);

      if (now < launchTime) {
        const diffMs = launchTime.getTime() - now.getTime();
        const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60));

        throw new AppError(
          `Hold on! ${productDoc.title} is not available yet. Dropping in ${diffHrs} hours.`,
          httpStatus.BAD_REQUEST,
        );
      }
    }
    const fulfillmentType = variant.fulfillmentType || PRODUCT_FULFILLMENT_TYPE.READY_TO_SHIP;

    // 1. TYPE DETECTION
    if (fulfillmentType === PRODUCT_FULFILLMENT_TYPE.READY_TO_SHIP) {
      hasReadyToShip = true;
    } else if (fulfillmentType === PRODUCT_FULFILLMENT_TYPE.CROSS_BORDER) {
      hasCrossBorder = true;
    }

    // 2. STOCK VALIDATION (Only for Ready to Ship)
    // Cross-Border limits are checked in the Service layer to keep transactions tight
    if (fulfillmentType === PRODUCT_FULFILLMENT_TYPE.READY_TO_SHIP) {
      const stock = variant.inventory?.stock ?? 0;
      if (stock < item.quantity) {
        throw new AppError(`Not enough stock for ${productDoc.title}.`, httpStatus.BAD_REQUEST);
      }
    }

    const price = variant.priceBDT || productDoc.defaultPriceBDT || 0;
    subtotal += price * item.quantity;

    initialOrderItems.push({
      product: productDoc._id,
      sku: item.sku,
      quantity: item.quantity,
      priceAtPurchase: price,
      fulfillmentType,
    });
  }

  // 3. MIXED CART BLOCKER
  if (hasReadyToShip && hasCrossBorder) {
    throw new AppError(
      'Mixed Cart Error: You cannot checkout "Ready to Ship" and "Global Import" items together. Please purchase them separately.',
      httpStatus.BAD_REQUEST,
    );
  }

  // Default to standard if empty, otherwise detect based on flags
  const detectedOrderType = hasCrossBorder ? 'pre-order' : 'standard';

  return { initialOrderItems, subtotal, detectedOrderType };
};

export const _decrementStockAndNotify = async (
  items: IOrderItem[],
  ProductModel: TProductModel,
  storePreference: TBrand,
  session?: ClientSession,
): Promise<void> => {
  const LOW_STOCK_THRESHOLD = 5;
  const brandConfig = config.client[storePreference];

  for (const item of items) {
    const productDoc = await ProductModel.findOne(
      {
        'variants.sku': item.sku,
        isPublished: true, // Prevent checkout of drafted items
        status: PRODUCT_STATUS.Active,
      },
      { 'variants.$': 1, title: 1 },
    ).session(session || null);

    if (!productDoc?.variants?.length) continue;
    const variant = productDoc.variants[0];

    // IGNORE Cross Border in this function (Safety check)
    if (variant.fulfillmentType === PRODUCT_FULFILLMENT_TYPE.CROSS_BORDER) continue;

    const currentStock = variant.inventory?.stock ?? 0;
    const newQty = currentStock - item.quantity;

    await ProductModel.updateOne(
      { 'variants.sku': item.sku },
      { $inc: { 'variants.$.inventory.stock': -item.quantity } },
      { session },
    );

    // Notifications
    const notifyParams = {
      sku: item.sku,
      productTitle: variant.name || productDoc.title,
      companyName: brandConfig.companyName,
      companyLogoUrl: brandConfig.logoUrl,
      adminDashboardLink: `${brandConfig.url}/admin/inventory`,
    };

    const subjectPrefix = `[${storePreference === 'pandaBD' ? 'PandaBD' : 'BringByAir'}]`;

    if (newQty <= 0) {
      sendEmail(
        brandConfig.adminEmails,
        `${subjectPrefix} Out of Stock`,
        OutOfStockNotification(notifyParams),
        storePreference,
      );
    } else if (newQty <= LOW_STOCK_THRESHOLD) {
      sendEmail(
        brandConfig.adminEmails,
        `${subjectPrefix} Low Stock Warning`,
        LowStockNotification({ ...notifyParams, currentQty: newQty, threshold: LOW_STOCK_THRESHOLD }),
        storePreference,
      );
    }
  }
};

export const _restockItems = async (
  items: IOrderItem[],
  ProductModel: TProductModel,
  session?: ClientSession,
): Promise<void> => {
  for (const item of items) {
    const productDoc = await ProductModel.findOne({ 'variants.sku': item.sku }, { 'variants.$': 1 }).session(
      session || null,
    );
    if (productDoc && productDoc.variants.length > 0) {
      const variant = productDoc.variants[0];
      if (variant.fulfillmentType === PRODUCT_FULFILLMENT_TYPE.READY_TO_SHIP) {
        await ProductModel.updateOne(
          { 'variants.sku': item.sku },
          { $inc: { 'variants.$.inventory.stock': item.quantity } },
          { session },
        );
      }
    }
  }
};
