import { IOrder } from '@app/modules/Order/Order.interface';
import { ITransaction } from './Transaction.interface';
import { ProductModel } from '@app/modules/products/product.model';
import { getBrandConfig, _prepareItemsForEmail } from '@app/modules/Order/Order.email';
import OrderConfirmedEmail from '@app/Email_Templates/Order-Related/OrderConfirmedEmail';
import { OrderConfirmedEmailParams } from '@app/Email_Templates/Order-Related/oder.email.interface';
import { sendEmail } from '@utils/sendEmail';

const prepareInvoiceData = async (transaction: ITransaction, order: IOrder): Promise<OrderConfirmedEmailParams> => {
  const branding = getBrandConfig();
  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel);

  return {
    customerName: order.customerName || 'Walk-in Customer',
    orderNumber: order.orderId,
    createdAt: transaction.createdAt || new Date(),
    items: itemsForEmail,
    total: order.totalAmount,
    paidAmount: order.paymentInfo.paidAmount,
    dueAmount: order.paymentInfo.dueAmount,
    shippingAddress: order.shippingAddress || 'In-Store',
    companyName: branding.companyName,
    companyLogoUrl: branding.companyLogoUrl,
    supportEmail: branding.supportEmail,
    supportPhone: branding.supportPhone,
    customerEmail: order.customerEmail,
    clientUrl: branding.clientUrl,
    themeColor: branding.themeColor,
  };
};

/**
 * Sends the final invoice/receipt email after a payment is recorded.
 */
const sendPaymentInvoice = async (transaction: ITransaction, order: IOrder) => {
  // Fast fail: Don't attempt to send if there's no email address
  if (!order.customerEmail) return;

  const invoiceData = await prepareInvoiceData(transaction, order);

  const htmlContent = OrderConfirmedEmail(invoiceData);

  // Dynamic Subject Line based on payment status
  const isFullyPaid = order.paymentInfo.dueAmount <= 0;
  const subjectLabel = isFullyPaid ? 'Payment Complete - Final Invoice' : 'Payment Received - Updated Receipt';
  const subject = `[${invoiceData.companyName}] ${subjectLabel} for Order #${order.orderId}`;

  sendEmail(order.customerEmail, subject, htmlContent).catch((err) =>
    console.error(`Failed to send invoice for ${order.orderId}:`, err),
  );
};

const getInvoiceHtml = (params: OrderConfirmedEmailParams): string => {
  return OrderConfirmedEmail(params);
};

export const TransactionEmailService = {
  prepareInvoiceData,
  sendPaymentInvoice,
  getInvoiceHtml,
};
