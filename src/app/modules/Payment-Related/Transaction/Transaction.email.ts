/* eslint-disable @typescript-eslint/no-explicit-any */
import { Connection } from 'mongoose';
import { TBrand } from '@app/modules/auth/auth.interface';
import { IAddress, IOrder } from '@app/modules/Order/Order.interface';
import { ITransaction } from './Transaction.interface';
import { getProductModel } from '@app/modules/products/product.model';
import { getTransactionModel } from './Transaction.model';
import { getBrandConfig, _prepareItemsForEmail } from '@app/modules/Order/Order.email';
import { TOrderStatementProps } from '@app/Email_Templates/Payment-Related/payment.email.interface';
import CustomerInvoicePdfTemplate from '@app/Email_Templates/Payment-Related/CustomerInvoicePdfTemplate';
import OrderStatementTemplate from '@app/Email_Templates/Payment-Related/OrderStatementTemplate';
import { sendEmail } from '@utils/sendEmail';

const prepareInvoiceData = async (transaction: ITransaction, order: IOrder, connection: Connection) => {
  const ProductModel = getProductModel(connection);
  const branding = getBrandConfig(transaction.storePreference);

  const itemsForEmail = await _prepareItemsForEmail(order.items, ProductModel as any);

  let shippingNotice = '';
  let groupBuyNotice = '';

  // Group Buy Specialized Logic
  if (order.orderType === 'group-buy') {
    groupBuyNotice = `You've successfully secured your spot in this collective deal! Remember, your current price is the baseline. As more members join, the price drops for everyone. We will notify you to pay the reduced remaining balance once the campaign ends.`;
  }

  //  Standard / Pre-Order Shipping Logic
  // We skip this if it's a group-buy to keep the focus on the campaign
  if (order.items.length > 0 && order.orderType !== 'group-buy') {
    const productDoc = await ProductModel.findById(order.items[0].product).lean();
    const variant = productDoc?.variants.find((v: any) => v.sku === order.items[0].sku);

    if (variant) {
      if (variant.launchDate) {
        // If a specific date exists, format it nicely
        const date = new Date(variant.launchDate);
        shippingNotice = `Expected to ship on or after ${date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`;
      } else if (variant.deliveryEstimate) {
        shippingNotice = `Estimated delivery: ${variant.deliveryEstimate}`;
      }
    }
  }

  // Map the database value to a pretty label for the PDF
  const labelMap: Record<string, string> = {
    full: 'Full Payment',
    partial: 'Partial Payment',
    booking_money: 'Booking Money',
    remaining: 'Remaining Balance',
    refunded: 'Refund',
  };

  // Fallback logic for OLD data that doesn't have the new field yet
  let displayLabel = labelMap[transaction.paymentCategory || ''] || 'Payment';

  // If new field is missing (old data), check the amount logic as a fallback
  if (!transaction.paymentCategory) {
    const isSmall = transaction.amount < order.total * 0.2; // Simple heuristic
    if (isSmall && order.orderType === 'pre-order') displayLabel = 'Booking Money';
    else if (!isSmall && order.orderType === 'pre-order' && transaction.amount < order.total)
      displayLabel = 'Remaining Balance';
    else displayLabel = 'Full Payment';
  }

  return {
    orderNumber: order.orderNumber,
    companyName: branding.companyName,
    companyLogoUrl: branding.companyLogoUrl,
    customerName: order.shippingAddress.name,
    customerEmail: order.email,
    shippingAddress: order.shippingAddress,
    items: itemsForEmail,
    subtotal: order.subtotal || 0,
    discountAmount: order.discountAmount || 0,
    customDiscountAmount: order.customDiscountAmount || 0,
    tax: order.tax || 0,
    shippingFee: order.shippingFee || 0,
    total: order.total || 0,
    amountPaid: transaction.amount, // The specific amount paid in this transaction
    currency: 'BDT',

    paymentType: displayLabel,

    orderType: order.orderType,
    transactionId: transaction.gatewayInfo?.bankTransactionId || (transaction as any)._id?.toString() || 'N/A',

    paidAt: transaction.createdAt,

    userOrGuestId: order.user ? order.user.toString() : order.guestId!,
    supportEmail: branding.supportEmail,
    supportPhone: branding.supportPhone,
    shippingNotice,
    groupBuyNotice,
    themeColor: branding.themeColor,
  };
};

const prepareOrderStatementData = async (
  order: IOrder,
  connection: Connection,
  storePreference: TBrand,
): Promise<TOrderStatementProps> => {
  const ProductModel = getProductModel(connection);
  const TransactionModel = getTransactionModel(connection);
  const branding = getBrandConfig(storePreference);

  const itemsForStatement = await _prepareItemsForEmail(order.items, ProductModel as any);

  // Fetch all transactions (Sale and Refund) in chronological order
  const transactions = await TransactionModel.find({
    order: order._id,
    storePreference,
  })
    .sort({ createdAt: 1 })
    .lean();

  const totalRefunded = transactions.filter((t) => t.type === 'refund').reduce((sum, t) => sum + t.amount, 0);

  return {
    orderNumber: order.orderNumber,
    companyName: branding.companyName,
    companyLogoUrl: branding.companyLogoUrl,
    customerName: order.shippingAddress.name,
    customerEmail: order.email,
    shippingAddress: {
      name: order.shippingAddress.name,
      street1: order.shippingAddress.street1,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
      phone: order.shippingAddress.phone,
    } as IAddress,
    items: itemsForStatement,
    subtotal: order.subtotal || 0,
    discountAmount: order.discountAmount || 0,
    customDiscountAmount: order.customDiscountAmount || 0,
    tax: order.tax || 0,
    shippingFee: order.shippingFee || 0,
    total: order.total || 0,
    currency: 'BDT',
    userOrGuestId: order.user ? order.user.toString() : order.guestId!,
    supportEmail: branding.supportEmail,
    supportPhone: branding.supportPhone,
    transactions: transactions as any,
    totalPaid: order.paymentInfo.paidAmount || 0,
    totalRefunded,
    balanceDue: order.paymentInfo.dueAmount || 0,
    themeColor: branding.themeColor,
  };
};

const getInvoiceHtml = (data: any) => CustomerInvoicePdfTemplate(data);
const getStatementHtml = (data: TOrderStatementProps) => OrderStatementTemplate(data);

/**
 *  Sends the confirmation email immediately after payment verification.
 */
const sendPaymentInvoice = async (transaction: ITransaction, order: IOrder, connection: Connection) => {
  const invoiceData = await prepareInvoiceData(transaction, order, connection);
  const htmlContent = getInvoiceHtml(invoiceData);

  // Dynamic Subject Line based on Business Model
  let subject = `[${invoiceData.companyName}] Payment Confirmation - Order #${order.orderNumber}`;

  if (order.orderType === 'group-buy') {
    subject = `[${invoiceData.companyName}] Deal Joined! Your Spot is Locked - Order #${order.orderNumber}`;
  } else if (order.orderType === 'pre-order') {
    subject = `[${invoiceData.companyName}] Pre-Order Confirmed - Order #${order.orderNumber}`;
  }

  // Non-blocking send
  sendEmail(order.email!, subject, htmlContent, transaction.storePreference).catch((err) =>
    console.error(`Failed to send invoice for ${order.orderNumber}:`, err),
  );
};

export const TransactionEmailService = {
  prepareInvoiceData,
  prepareOrderStatementData,
  getInvoiceHtml,
  getStatementHtml,
  sendPaymentInvoice,
};
