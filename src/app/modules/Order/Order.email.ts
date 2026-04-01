import { sendEmail } from '@utils/sendEmail';
import { IOrder, IOrderItem } from './Order.interface';
import { config } from '@config/env';
import { TProductModel } from '../products/product.model';
import { IProduct } from '../products/product.interface';
import { StockNotificationEmailParams } from '@app/Email_Templates/Product-Related/product.email.interface';

import OutOfStockNotification from '@app/Email_Templates/Product-Related/OutOfStockNotification';
import LowStockNotification from '@app/Email_Templates/Product-Related/LowStockNotification';
import OrderConfirmedEmail from '@app/Email_Templates/Order-Related/OrderConfirmedEmail';
import OrderStatusUpdateEmail from '@app/Email_Templates/Order-Related/OrderStatusUpdateEmail';
import {
  OrderConfirmedEmailParams,
  OrderItemForEmail,
  OrderStatusUpdateEmailParams,
} from '@app/Email_Templates/Order-Related/oder.email.interface';

export const getBrandConfig = () => {
  return {
    companyName: config.client.companyName || 'Our Store',
    companyLogoUrl: config.client.logoUrl || '',
    supportEmail: config.client.supportEmail || 'support@ourstore.com',
    supportPhone: config.client.supportPhone || '+880123456789',
    clientUrl: config.client.url || 'http://localhost:3000',
    adminEmails: config.admin.notificationEmail || 'admin@ourstore.com',
    themeColor: '#2563eb',
  };
};

export const _prepareItemsForEmail = async (
  orderItems: IOrderItem[],
  ProductModel: TProductModel,
): Promise<OrderItemForEmail[]> => {
  if (!orderItems?.length) return [];

  const productIds = [...new Set(orderItems.map((item) => item.product.toString()))];

  const products = await ProductModel.find({ _id: { $in: productIds } })
    .lean()
    .exec();

  const productMap = new Map<string, IProduct>(products.map((p) => [p._id.toString(), p as unknown as IProduct]));

  return orderItems.map((oi) => {
    const productDoc = productMap.get(oi.product.toString());
    let imageUrl = '';

    if (productDoc) {
      const variant = productDoc.variants?.find((v) => v.sku === oi.sku);
      imageUrl = variant?.image?.url || productDoc.images?.[0]?.url || '';
    }

    return {
      sku: oi.sku,
      title: oi.name,
      quantity: oi.quantity,
      price: oi.unitPrice,
      imageUrl,
    };
  });
};

/**
 * Sent to the customer ONLY if they provided an email.
 * Acts as a digital transcript/receipt with an optional PDF attachment.
 */
const sendOrderReceiptToCustomer = async (order: IOrder, ProductModel: TProductModel, pdfBuffer?: Buffer) => {
  if (!order.customerEmail) return;

  const brandConfig = getBrandConfig();
  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);

  const emailParams: OrderConfirmedEmailParams = {
    customerName: order.customerName,
    orderNumber: order.orderId,
    createdAt: order.createdAt!,
    items: itemsForEmail,
    total: order.totalAmount,
    paidAmount: order.paymentInfo.paidAmount,
    dueAmount: order.paymentInfo.dueAmount,
    shippingAddress: order.shippingAddress || 'N/A',
    ...brandConfig,
  };

  const subject = `[${brandConfig.companyName}] Your Order Receipt: ${order.orderId}`;
  const htmlContent = OrderConfirmedEmail(emailParams);

  // Format the PDF buffer for Nodemailer
  const attachments = pdfBuffer
    ? [
        {
          filename: `Receipt-${order.orderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    : [];

  await sendEmail(order.customerEmail, subject, htmlContent, attachments).catch(console.error);
};

/**
 * Sent strictly to the Admin when an item drops below the threshold.
 */
const sendAdminLowStockAlert = async (productTitle: string, sku: string, currentStock: number, threshold: number) => {
  const brandConfig = getBrandConfig();
  const isOutOfStock = currentStock <= 0;

  // Type-checked against StockNotificationEmailParams
  const notifyParams: StockNotificationEmailParams = {
    sku,
    productTitle,
    companyName: brandConfig.companyName,
    companyLogoUrl: brandConfig.companyLogoUrl,
    currentQty: currentStock,
    threshold,
    clientUrl: brandConfig.clientUrl, // Provided for the dashboard link
  };

  const subject = `[${brandConfig.companyName} IMS Alert] ${isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK'} - ${sku}`;

  const htmlContent = isOutOfStock ? OutOfStockNotification(notifyParams) : LowStockNotification(notifyParams);

  await sendEmail(brandConfig.adminEmails, subject, htmlContent).catch(console.error);
};

/**
 * Status Update for the Customer (Shipped, Delivered, Cancelled)
 */
const sendOrderStatusUpdateEmail = async (
  order: IOrder,
  ProductModel: TProductModel,
  updateTitle: string,
  updateMessage: string,
) => {
  if (!order.customerEmail) return;

  const brandConfig = getBrandConfig();
  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);

  const emailParams: OrderStatusUpdateEmailParams = {
    customerName: order.customerName,
    orderNumber: order.orderId,
    items: itemsForEmail,
    updateTitle,
    updateMessage,
    ...brandConfig,
  };

  const subject = `[${brandConfig.companyName}] Order #${order.orderId} Update: ${updateTitle}`;
  const htmlContent = OrderStatusUpdateEmail(emailParams);

  await sendEmail(order.customerEmail, subject, htmlContent).catch(console.error);
};

export const OrderRelatedEmails = {
  sendOrderReceiptToCustomer,
  sendAdminLowStockAlert,
  sendOrderStatusUpdateEmail,
};
