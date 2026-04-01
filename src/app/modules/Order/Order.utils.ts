import { ClientSession } from 'mongoose';
import { IOrderItem } from './Order.interface';
import { TProductModel } from '../products/product.model';
import { OrderRelatedEmails } from './Order.email';

export const generateOrderId = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const datePart = `${year}${month}${day}`;

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `ORD-${datePart}-${randomPart}`;
};

/**
 * Decrements stock atomically and checks if the item has hit the Restock Queue threshold.
 * If stock <= minStockThreshold, it triggers the Admin Alert.
 */
export const _decrementStockAndNotify = async (
  items: IOrderItem[],
  ProductModel: TProductModel,
  session?: ClientSession,
): Promise<void> => {
  for (const item of items) {
    // Fetch current product/variant state
    const productDoc = await ProductModel.findOne(
      { _id: item.product, 'variants._id': item.variantId },
      { title: 1, 'variants.$': 1 },
    ).session(session || null);

    if (!productDoc || !productDoc.variants.length) continue;

    const variant = productDoc.variants[0];

    //  Decrement Stock Atomically
    await ProductModel.updateOne(
      { _id: item.product, 'variants._id': item.variantId },
      { $inc: { 'variants.$.inventory.stock': -item.quantity } },
      { session },
    );

    // Calculate new stock for Notification Logic
    const currentStock = variant.inventory?.stock ?? 0;
    const newStock = currentStock - item.quantity;
    const threshold = variant.inventory?.minStockThreshold ?? 10;

    // Restock Queue Notification
    // We notify if the stock JUST dropped below the threshold, or hit zero.
    if (newStock <= threshold) {
      OrderRelatedEmails.sendAdminLowStockAlert(variant.name || productDoc.title, item.sku, newStock, threshold).catch(
        (err) => console.error('Failed to send low stock alert:', err),
      );
    }
  }
};

/**
 * Reverts stock. Used when an Admin Cancels an order.
 */
export const _restockItems = async (
  items: IOrderItem[],
  ProductModel: TProductModel,
  session?: ClientSession,
): Promise<void> => {
  for (const item of items) {
    await ProductModel.updateOne(
      { _id: item.product, 'variants._id': item.variantId },
      { $inc: { 'variants.$.inventory.stock': item.quantity } },
      { session },
    );
  }
};
