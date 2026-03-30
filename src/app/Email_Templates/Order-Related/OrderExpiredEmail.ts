import { OrderExpiredEmailParams } from './oder.email.interface';

const OrderExpiredEmail = (
  params: OrderExpiredEmailParams & {
    paidAmount: number;
    dueAmount: number;
    customDiscountAmount: number;
    themeColor?: string;
  },
) => {
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
    paidAmount,
    dueAmount,
    shippingAddress,
    supportEmail,
    supportPhone,
    userEmail,
    companyName,
    companyLogoUrl,
    expiryDate,
    reorderLink,
    themeColor,
  } = params;

  // Format date and currency (BDT)
  const orderDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const expiryStr = new Date(expiryDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const formatCurrency = (amount: number) => `৳&nbsp;${amount.toFixed(2)}`;

  const buttonColor = themeColor || '#2563EB';

  // Build HTML rows for each item (with unit price & line total)
  const itemsHtml = items
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      return `
      <tr style="border-bottom: 1px solid #dddddd;">
        <td style="padding: 12px; text-align: center;">
          <img
            src="${item.imageUrl}"
            alt="${item.title}"
            width="60"
            style="display: block; border: 0; margin: 0 auto;"
          />
        </td>
        <td style="padding: 12px; font-size: 14px; color: #333333;">
          <strong>${item.title}</strong><br />
          <span style="color: #777777; font-size: 12px;">SKU: ${item.sku}</span>
        </td>
        <td style="padding: 12px; text-align: center; font-size: 14px; color: #333333;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; text-align: right; font-size: 14px; color: #333333;">
          ${formatCurrency(item.price)}
        </td>
        <td style="padding: 12px; text-align: right; font-size: 14px; color: #333333;">
          ${formatCurrency(lineTotal)}
        </td>
      </tr>`;
    })
    .join('');

  // Expired note block preserved exactly as original
  const expiredNoteHtml = `
    <p style="margin: 0 0 15px; font-size: 16px; color: #cc0000; line-height: 1.5;">
      Your order <strong>${orderNumber}</strong> expired on <strong>${expiryStr}</strong> and has been cancelled from our system. If you’d like to place the same order again, simply click the button below to reorder.
    </p>
  `;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Expired – ${companyName}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              font-family: Arial, sans-serif;
              border: 1px solid #dddddd;
            "
          >
            <tr>
              <td
                style="padding: 20px; text-align: left;"
              >
                <img
                  src="${companyLogoUrl}"
                  alt="${companyName} Logo"
                  width="160"
                  style="display: block; border: 0; margin: 0;"
                />
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <h2
                  style="margin: 20px 0 10px; font-size: 22px; color: #333333;"
                >
                  Hello ${customerName},
                </h2>
                ${expiredNoteHtml}
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    border-collapse: collapse;
                    border: 1px solid #dddddd;
                  "
                >
                  <thead>
                    <tr style="background-color: #f9f9f9;">
                      <th
                        colspan="2"
                        style="
                          padding: 12px;
                          text-align: left;
                          font-size: 14px;
                          color: #333333;
                          border-bottom: 1px solid #dddddd;
                        "
                      >
                        Order Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td
                        style="
                          padding: 10px;
                          font-size: 14px;
                          color: #333333;
                          width: 40%;
                        "
                      >
                        <strong>Order Number:</strong>
                      </td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">
                        ${orderNumber}
                      </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;">
                        <strong>Viewer ID:</strong>
                      </td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">
                        ${userOrGuestId}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">
                        <strong>Order Date:</strong>
                      </td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">
                        ${orderDate}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px;">
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    border-collapse: collapse;
                    border: 1px solid #dddddd;
                    margin-bottom: 20px;
                  "
                >
                  <thead>
                    <tr style="background-color: #f9f9f9;">
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Product</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Name &amp; SKU</th>
                      <th style="padding: 12px; text-align: center; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Qty</th>
                      <th style="padding: 12px; text-align: right; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Unit Price</th>
                      <th style="padding: 12px; text-align: right; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}

                    <tr style="border-top: 1px solid #dddddd;">
                      <td colspan="4" style="padding: 10px; text-align: right; font-size: 14px; color: #333333;"><strong>Subtotal:</strong></td>
                      <td style="padding: 10px; text-align: right; font-size: 14px; color: #333333;">${formatCurrency(subtotal)}</td>
                    </tr>
                    ${discountAmount > 0 ? `<tr><td colspan="4" style="padding: 10px; text-align: right; font-size: 14px; color: #333333;"><strong>Discount:</strong></td><td style="padding: 10px; text-align: right; font-size: 14px; color: #d9534f;">−${formatCurrency(discountAmount)}</td></tr>` : ``}
                    ${customDiscountAmount > 0 ? `<tr><td colspan="4" style="padding: 10px; text-align: right; font-size: 14px; color: #333333;"><strong>Admin Adjustment:</strong></td><td style="padding: 10px; text-align: right; font-size: 14px; color: #d9534f;">−${formatCurrency(customDiscountAmount)}</td></tr>` : ``}
                    <tr><td colspan="4" style="padding: 10px; text-align: right; font-size: 14px; color: #333333;"><strong>Tax:</strong></td><td style="padding: 10px; text-align: right; font-size: 14px; color: #333333;">${formatCurrency(taxAmount)}</td></tr>
                    <tr><td colspan="4" style="padding: 10px; text-align: right; font-size: 14px; color: #333333;"><strong>Shipping:</strong></td><td style="padding: 10px; text-align: right; font-size: 14px; color: #333333;">${formatCurrency(shippingFee)}</td></tr>
                    
                    <tr style="border-top: 1px solid #dddddd; background-color: #f9f9f9;">
                      <td colspan="4" style="padding: 12px; text-align: right; font-size: 16px; color: #333333;"><strong>Grand Total:</strong></td>
                      <td style="padding: 12px; text-align: right; font-size: 16px; color: #333333;"><strong>${formatCurrency(total)}</strong></td>
                    </tr>

                    ${
                      paidAmount > 0
                        ? `
                    <tr><td colspan="4" style="padding: 10px; text-align: right; font-size: 14px; color: #28a745;"><strong>Already Paid:</strong></td><td style="padding: 10px; text-align: right; font-size: 14px; color: #28a745;">−${formatCurrency(paidAmount)}</td></tr>
                    <tr><td colspan="4" style="padding: 10px; text-align: right; font-size: 14px; color: #333333;"><strong>Remaining Balance:</strong></td><td style="padding: 10px; text-align: right; font-size: 14px; color: #333333;">${formatCurrency(dueAmount)}</td></tr>
                    `
                        : ``
                    }
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px; text-align: center;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td align="center" bgcolor="${buttonColor}" style="border-radius: 5px;">
                      <a
                        href="${reorderLink}"
                        target="_blank"
                        style="
                          display: inline-block;
                          padding: 12px 24px;
                          font-size: 16px;
                          font-weight: 600;
                          color: #ffffff;
                          text-decoration: none;
                        "
                      >
                        Reorder Now
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
                      <th colspan="2" style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Shipping Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        colspan="2"
                        style="padding: 10px; font-size: 14px; color: #333333;"
                      >
                        <strong>Recipient:</strong> ${shippingAddress.name}<br/>
                        <strong>Street:</strong> ${shippingAddress.street1}<br/>
                        <strong>City, Postal Code:</strong> ${shippingAddress.city}, ${shippingAddress.postalCode}<br/>
                        <strong>Country:</strong> ${shippingAddress.country}<br/>
                        <strong>Phone:</strong> ${shippingAddress.phone}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <p style="margin: 0; font-size: 16px; color: #555555;">
                  If you have any questions or need assistance, please contact our support team:
                </p>
                <p style="margin: 5px 0 0; font-size: 16px; color: #555555;">
                  <strong>Email:</strong> <a href="mailto:${supportEmail}" style="color: #2a7ae2; text-decoration: none;">${supportEmail}</a><br />
                  <strong>Phone:</strong> <a href="tel:${supportPhone}" style="color: #2a7ae2; text-decoration: none;">${supportPhone}</a>
                </p>
                <p style="margin: 20px 0 20px; font-size: 16px; line-height: 1.5; color: #666666;">
                  Thanks,<br/>
                  ${companyName} Team
                </p>
              </td>
            </tr>

            <tr>
              <td>
                <hr style="border: 1px solid #e5e7eb; margin: 24px 0;" />
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px; text-align: center;">
                <footer>
                  <h3 style="font-size: 18px; color: #374151;">Stay Connected</h3>
                  <p style="font-size: 16px; color: #6b7280; margin: 8px 0;">
                    Follow us on social media for the latest updates and promotions.
                  </p>
                  <div style="margin-top: 16px;">
                    <a href="#" style="margin: 0 8px;">
                      <img
                        src="https://res.cloudinary.com/dydv6uxzo/image/upload/v1753341562/ReLoved_Gadget/Assets/icons/facebook_mzvjbm.png"
                        alt="Facebook"
                        style="width: 30px; height: 30px;"
                      />
                    </a>
                    <a href="#" style="margin: 0 8px;">
                      <img
                        src="https://i.ibb.co/cJbSJ2K/twitter.png"
                        alt="Twitter"
                        style="width: 30px; height: 30px;"
                      />
                    </a>
                    <a href="#" style="margin: 0 8px;">
                      <img
                        src="https://i.ibb.co/P60Jbqy/insta.png"
                        alt="Instagram"
                        style="width: 30px; height: 30px;"
                      />
                    </a>
                    <a
                      href="https://wa.me/+8801733843279"
                      target="_blank"
                      style="margin: 0 8px;"
                    >
                      <img
                        src="https://res.cloudinary.com/dydv6uxzo/image/upload/v1753341562/ReLoved_Gadget/Assets/icons/whatsapp-icon_fml5kj.png"
                        alt="WhatsApp"
                        style="width: 30px; height: 30px;"
                      />
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #6b7280; margin: 16px 0 4px;">
                    This email was sent to <a href="mailto:${userEmail}" style="color: rgb(33, 47, 243); text-decoration: none;">${userEmail}</a>. This is an automated email. Please do not reply.
                  </p>
                  <p style="font-size: 14px; color: #6b7280;">
                    &copy; ${new Date().getFullYear()} ${companyName}. All Rights Reserved.
                  </p>
                </footer>
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

export default OrderExpiredEmail;
