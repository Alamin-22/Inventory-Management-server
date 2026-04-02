import { OrderConfirmedEmailParams } from './oder.email.interface';

const OrderConfirmedEmail = (params: OrderConfirmedEmailParams) => {
  const {
    customerName,
    orderNumber,
    createdAt,
    items,
    total,
    paidAmount,
    dueAmount,
    shippingAddress,
    supportEmail,
    supportPhone,
    customerEmail,
    companyName,
    companyLogoUrl,
    clientUrl,
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
            src="${item.imageUrl || 'https://via.placeholder.com/60?text=No+Image'}"
            alt="${item.title}"
            width="60"
            style="display: block; border: 0; border-radius: 4px;"
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

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Receipt - ${companyName}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; border: 1px solid #dddddd;">
            <tr>
              <td style="padding: 20px; text-align: center;">
                ${
                  companyLogoUrl
                    ? `<img src="${companyLogoUrl}" alt="${companyName} Logo" width="160" style="display: block; border: 0; margin: 0 auto;" />`
                    : `<h2 style="margin: 0; color: #333333;">${companyName}</h2>`
                }
              </td>
            </tr>

            <tr>
              <td style="padding: 30px 30px 20px;">
                <h2 style="margin: 0 0 10px; font-size: 22px; color: #333333;">Hello ${customerName},</h2>
                <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #555555;">
                  This is a digital receipt for your recent order with <strong>${companyName}</strong>. Please review the details below.
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
                      <th width="15%" style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Item</th>
                      <th width="35%" style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Details</th>
                      <th width="10%" style="padding: 12px; text-align: center; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Qty</th>
                      <th width="20%" style="padding: 12px; text-align: right; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Unit Price</th>
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
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; font-weight: bold;">Grand Total:</td>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #333333; width: 130px;"><strong>${formatCurrency(total)}</strong></td>
                          </tr>
                          <tr>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #16a34a; font-weight: bold;">Amount Paid:</td>
                            <td style="padding: 5px; text-align: right; font-size: 14px; color: #16a34a; width: 130px;">${formatCurrency(paidAmount)}</td>
                          </tr>
                          <tr style="background-color: ${dueAmount > 0 ? '#fff8f8' : '#f0fdf4'};">
                            <td style="padding: 10px 5px; text-align: right; font-size: 16px; color: ${dueAmount > 0 ? '#d9534f' : '#16a34a'}; font-weight: bold;">Balance Due:</td>
                            <td style="padding: 10px 5px; text-align: right; font-size: 16px; color: ${dueAmount > 0 ? '#d9534f' : '#16a34a'}; width: 130px; border: 1px dashed ${dueAmount > 0 ? '#d9534f' : '#16a34a'};"><strong>${formatCurrency(dueAmount)}</strong></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 30px; text-align: center;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td align="center" bgcolor="${buttonColor}" style="border-radius: 5px;">
                      <a href="${clientUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Visit Our Portal
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
                        ${shippingAddress && shippingAddress !== 'N/A' ? shippingAddress.replace(/\n/g, '<br/>') : 'No shipping address provided.'}
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
                    ${
                      whatsAppNumber
                        ? `<a href="https://wa.me/${whatsAppNumber}" target="_blank" style="margin: 0 8px;"><img src="https://res.cloudinary.com/dydv6uxzo/image/upload/v1753341562/ReLoved_Gadget/Assets/icons/whatsapp-icon_fml5kj.png" alt="WhatsApp" style="width: 30px; height: 30px;" /></a>`
                        : ''
                    }
                 </div>
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">This automated email was sent to <a href="mailto:${customerEmail}" style="color: #2a7ae2; text-decoration: none;">${customerEmail}</a>.</p>
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
