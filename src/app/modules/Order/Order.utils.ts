import { ClientSession } from 'mongoose';
import { IOrderItem } from './order.interface';
import { TProductModel } from '../products/product.model';
import { OrderRelatedEmails } from './order.email';

/**
 * Generates a clean, human-readable Order ID for the IMS Dashboard.
 * Example: ORD-260401-A4B9Z
 */
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
 * Checks stock levels AFTER deduction.
 * If stock <= minStockThreshold, it triggers the Admin Alert / Restock Queue logic.
 */
export const _checkLowStockAndNotify = async (
  items: IOrderItem[],
  ProductModel: TProductModel,
  session?: ClientSession,
): Promise<void> => {
  for (const item of items) {
    const productDoc = await ProductModel.findOne(
      { _id: item.product, 'variants._id': item.variantId },
      { title: 1, 'variants.$': 1 },
    ).session(session || null);

    if (!productDoc || !productDoc.variants.length) continue;

    const variant = productDoc.variants[0];
    const currentStock = variant.inventory?.stock ?? 0;
    const threshold = variant.inventory?.minStockThreshold ?? 10;

    // TASK DOC RULE #5: Restock Queue (Low Stock Management)
    if (currentStock <= threshold) {
      // 1. Send an email to the Admin (Fire and forget, don't await)
      OrderRelatedEmails.sendAdminLowStockAlert(
        variant.name || productDoc.title,
        item.sku,
        currentStock,
        threshold,
      ).catch((err) => console.error('Failed to send low stock alert:', err));

      // 2. FUTURE IMPLEMENTATION: Add to Restock Queue Database Table
      // await RestockQueueModel.updateOne(
      //   { sku: item.sku },
      //   { $setOnInsert: { product: productDoc._id, priority: currentStock === 0 ? 'High' : 'Medium' } },
      //   { upsert: true, session }
      // );
    }
  }
};
