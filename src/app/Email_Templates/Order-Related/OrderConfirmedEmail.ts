import { OrderConfirmedEmailParams } from './oder.email.interface';

const OrderConfirmedEmail = (params: OrderConfirmedEmailParams) => {
  const {
    customerName,
    orderNumber,
    userOrGuestId,
    createdAt,
    items,
    subtotal,
    discountAmount,
    customDiscountAmount,
    taxAmount,
    shippingFee,
    total,
    minAmountToPay, // Calculated booking deposit from service
    paymentUrl,
    overrideNoteHtml,
    shippingAddress,
    supportEmail,
    supportPhone,
    userEmail,
    companyName,
    companyLogoUrl,
    cancelLink,
    themeColor,
  } = params;

  const orderDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (amount: number) => `৳&nbsp;${amount.toFixed(2)}`;

  const whatsAppNumber = supportPhone ? supportPhone.replace(/[^0-9]/g, '') : '';
  const buttonColor = themeColor || '#2563EB';

  // Build HTML rows for each item
  const itemsHtml = items
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      return `
      <tr style="border-bottom: 1px solid #dddddd;">
        <td style="padding: 12px; text-align: left; vertical-align: top;">
          <img
            src="${item.imageUrl}"
            alt="${item.title}"
            width="60"
            style="display: block; border: 0;"
          />
        </td>
        <td style="padding: 12px; font-size: 14px; color: #333333; text-align: left; vertical-align: top;">
          <strong>${item.title}</strong><br />
          <span style="color: #777777; font-size: 12px;">SKU: ${item.sku}</span>
        </td>
        <td style="padding: 12px; text-align: center; font-size: 14px; color: #333333; vertical-align: top;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; text-align: right; font-size: 14px; color: #333333; vertical-align: top;">
          ${formatCurrency(item.price)}
        </td>
        <td style="padding: 12px; text-align: right; font-size: 14px; color: #333333; vertical-align: top;">
          ${formatCurrency(lineTotal)}
        </td>
      </tr>`;
    })
    .join('');

  // INSTRUCTION LOGIC: Preserves the yellow box design for dynamic sourcing/payment instructions
  const noteBlockHtml =
    overrideNoteHtml && overrideNoteHtml.trim()
      ? `
      <div style="border: 1px solid #ffcc00; background-color: #fffbea; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
        <div style="font-size: 15px; color: #333333; line-height: 1.5;">${overrideNoteHtml}</div>
      </div>
      `
      : `<p style="margin: 0 0 15px; font-size: 16px; color: #333333; line-height: 1.5;">
          Your order has been <strong>reviewed and confirmed</strong>! Please click the button below to complete the payment and start the fulfillment process.
         </p>`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Confirmed - ${companyName}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; border: 1px solid #dddddd;">
            <tr>
              <td style="padding: 20px; text-align: center;">
                <img src="${companyLogoUrl}" alt="${companyName} Logo" width="160" style="display: block; border: 0;" />
              </td>
            </tr>

            <tr>
              <td style="padding: 30px 30px 20px;">
                <h2 style="margin: 0 0 10px; font-size: 22px; color: #333333;">Hello ${customerName},</h2>
                <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #555555;">
                  Great news! Your order is ready. Below are the finalized details. To proceed with the order, please complete your payment.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #dddddd;">
                  <thead>
                    <tr style="background-color: #f9f9f9;">
                      <th colspan="2" style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Order Meta Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td style="padding: 10px; font-size: 14px; color: #333333; width: 40%;"><strong>Order Number:</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${orderNumber}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Customer ID:</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${userOrGuestId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Confirmation Date:</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${orderDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #dddddd; margin-bottom: 20px;">
                  <thead>
                    <tr style="background-color: #f9f9f9;">
                      <th width="15%" style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Product</th>
                      <th width="35%" style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Name & SKU</th>
                      <th width="10%" style="padding: 12px; text-align: center; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Qty</th>
                      <th width="20%" style="padding: 12px; text-align: right; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Price</th>
                      <th width="20%" style="padding: 12px; text-align: right; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tbody style="border-top: 2px solid #dddddd;">
                    <tr>
                      <td colspan="5" style="padding: 10px 0;">
                        <table align="right" border="0" cellpadding="0" cellspacing="0" style="width: auto; margin-right: 12px;">
                          <tr>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; font-weight: bold;">Subtotal:</td>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; width: 130px;">${formatCurrency(subtotal)}</td>
                          </tr>
                          ${
                            discountAmount > 0
                              ? `
                          <tr>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; font-weight: bold;">Coupon Discount:</td>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #d9534f; width: 130px;">−${formatCurrency(discountAmount)}</td>
                          </tr>`
                              : ''
                          }
                          ${
                            customDiscountAmount > 0
                              ? `
                          <tr>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; font-weight: bold;">Admin Adjustment:</td>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #d9534f; width: 130px;">−${formatCurrency(customDiscountAmount)}</td>
                          </tr>`
                              : ''
                          }
                          ${
                            taxAmount > 0
                              ? `
                          <tr>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; font-weight: bold;">Estimated Tax:</td>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; width: 130px;">${formatCurrency(taxAmount)}</td>
                          </tr>`
                              : ''
                          }
                          ${
                            shippingFee > 0
                              ? `
                          <tr>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; font-weight: bold;">Shipping:</td>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; width: 130px;">${formatCurrency(shippingFee)}</td>
                          </tr>`
                              : ''
                          }
                          <tr style="border-top: 1px solid #eee;">
                             <td style="padding: 8px 5px 5px; text-align: right; font-size: 14px; color: #333333; font-weight: bold;">Grand Total:</td>
                             <td style="padding: 8px 5px 5px; text-align: right; font-size: 14px; color: #333333; width: 130px;"><strong>${formatCurrency(total)}</strong></td>
                          </tr>
                          <tr style="background-color: #fff8f8;">
                             <td style="padding: 10px 5px; text-align: right; font-size: 16px; color: #d9534f; font-weight: bold;">Payable Now (Deposit):</td>
                             <td style="padding: 10px 5px; text-align: right; font-size: 16px; color: #d9534f; width: 130px; border: 1px dashed #d9534f;"><strong>${formatCurrency(minAmountToPay)}</strong></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 0 30px 20px;">
                ${noteBlockHtml}
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 30px; text-align: center;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td align="center" bgcolor="${buttonColor}" style="border-radius: 5px;">
                      <a href="${paymentUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Pay To Start Processing
                      </a>
                    </td>
                    <td width="15"></td>
                    <td align="center" bgcolor="#DC2626" style="border-radius: 5px;">
                      <a href="${cancelLink}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Cancel Order
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #dddddd;">
                  <thead>
                    <tr style="background-color: #f9f9f9;">
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Shipping Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 12px; font-size: 14px; color: #555555; line-height: 1.6;">
                        <strong>${shippingAddress.name}</strong><br/>
                        ${shippingAddress.street1}<br/>
                        ${shippingAddress.city}, ${shippingAddress.postalCode}<br/>
                        ${shippingAddress.country}<br/>
                        Phone: ${shippingAddress.phone}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 20px 30px 20px;">
                <p style="margin: 0 0 10px; font-size: 16px; color: #555555;">If you have any questions, please contact our support team:</p>
                <p style="margin: 0; font-size: 16px; color: #555555; line-height: 1.6;">
                  <strong>Email:</strong> <a href="mailto:${supportEmail}" style="color: #2a7ae2; text-decoration: none;">${supportEmail}</a><br />
                  <strong>Phone:</strong> <a href="tel:${supportPhone}" style="color: #2a7ae2; text-decoration: none;">${supportPhone}</a>
                </p>
                <p style="margin: 25px 0 20px; font-size: 16px; line-height: 1.5; color: #666666;">
                  Thanks,<br/>
                  The ${companyName} Team
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 20px 30px; text-align: center; background-color: #f9f9f9; border-top: 1px solid #dddddd;">
                 <div style="margin-bottom: 16px;">
                    <a href="#" style="margin: 0 8px;"><img src="https://res.cloudinary.com/dydv6uxzo/image/upload/v1753341562/ReLoved_Gadget/Assets/icons/facebook_mzvjbm.png" alt="Facebook" style="width: 30px; height: 30px;" /></a>
                    <a href="#" style="margin: 0 8px;"><img src="https://i.ibb.co/cJbSJ2K/twitter.png" alt="Twitter" style="width: 30px; height: 30px;" /></a>
                    <a href="#" style="margin: 0 8px;"><img src="https://i.ibb.co/P60Jbqy/insta.png" alt="Instagram" style="width: 30px; height: 30px;" /></a>
                    <a href="https://wa.me/${whatsAppNumber}" target="_blank" style="margin: 0 8px;"><img src="https://res.cloudinary.com/dydv6uxzo/image/upload/v1753341562/ReLoved_Gadget/Assets/icons/whatsapp-icon_fml5kj.png" alt="WhatsApp" style="width: 30px; height: 30px;" /></a>
                 </div>
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">This automated email was sent to <a href="mailto:${userEmail}" style="color: #2a7ae2; text-decoration: none;">${userEmail}</a>.</p>
                <p style="font-size: 12px; color: #6b7280; margin: 0;">&copy; ${new Date().getFullYear()} ${companyName}. All Rights Reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export default OrderConfirmedEmail;
