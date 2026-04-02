import { ClientSession } from 'mongoose';
import httpStatus from 'http-status';
import { AppError } from '@app/classes/AppError';
import { IOrderItem } from './Order.interface';
import { TProductModel } from '../products/product.model';
import { OrderRelatedEmails } from './Order.email';
import { IProduct, IProductVariant } from '../products/product.interface';
import { PRODUCT_STATUS } from '../products/product.constants';

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

export const _decrementStockAndNotify = async (
  items: IOrderItem[],
  ProductModel: TProductModel,
  session?: ClientSession,
): Promise<void> => {
  for (const item of items) {
    // 1. Atomic Stock Deduction (Strict DB-level guard prevents negative stock)
    const updateResult = (await ProductModel.findOneAndUpdate(
      {
        _id: item.product,
        'variants._id': item.variantId,
        'variants.inventory.stock': { $gte: item.quantity }, // Absolute safety net
      },
      {
        $inc: { 'variants.$.inventory.stock': -item.quantity },
      },
      { session, new: true, lean: true },
    )) as IProduct;

    // If updateResult is null, the $gte condition failed, meaning it sold out exactly at checkout
    if (!updateResult) {
      throw new AppError(`Inventory conflict: ${item.name} sold out during checkout.`, httpStatus.CONFLICT);
    }

    // 2. Post-Deduction State Checks
    const updatedVariant = updateResult.variants.find(
      (v: IProductVariant) => v._id?.toString() === item.variantId?.toString(),
    );
    const newStock = updatedVariant?.inventory?.stock || 0;
    const threshold = updatedVariant?.inventory?.minStockThreshold || 10;

    // 3. Out of Stock Parent Evaluation
    const totalRemainingStock = updateResult.variants.reduce(
      (acc: number, v: IProductVariant) => acc + (v.inventory?.stock || 0),
      0,
    );
    if (totalRemainingStock <= 0) {
      await ProductModel.updateOne(
        { _id: item.product },
        { $set: { status: PRODUCT_STATUS.Out_Of_Stock } },
        { session },
      );
    }

    // 4. Restock Queue Notification
    if (newStock <= threshold) {
      OrderRelatedEmails.sendAdminLowStockAlert(
        updatedVariant?.name || updateResult.title,
        item.sku,
        newStock,
        threshold,
      ).catch((err) => console.error('Failed to send low stock alert:', err));
    }
  }
};

/**
 * Reverts stock. Used when an Admin or Customer Cancels an order.
 * Intelligently flips 'Out of Stock' products back to 'Active' if stock is restored.
 */
export const _restockItems = async (
  items: IOrderItem[],
  ProductModel: TProductModel,
  session?: ClientSession,
): Promise<void> => {
  for (const item of items) {
    // Increment the stock back
    const updateResult = (await ProductModel.findOneAndUpdate(
      { _id: item.product, 'variants._id': item.variantId },
      { $inc: { 'variants.$.inventory.stock': item.quantity } },
      { session, new: true, lean: true },
    )) as IProduct;

    // If the product was previously marked as out of stock, but now has inventory, reactivate it
    if (updateResult && updateResult.status === PRODUCT_STATUS.Out_Of_Stock) {
      const totalRemainingStock = updateResult.variants.reduce(
        (acc: number, v: IProductVariant) => acc + (v.inventory?.stock || 0),
        0,
      );

      if (totalRemainingStock > 0) {
        await ProductModel.updateOne({ _id: item.product }, { $set: { status: PRODUCT_STATUS.Active } }, { session });
      }
    }
  }
};
