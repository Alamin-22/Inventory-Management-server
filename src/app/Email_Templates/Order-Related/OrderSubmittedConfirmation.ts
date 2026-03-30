import { OrderSubmittedEmailParams } from './oder.email.interface';

const OrderSubmittedConfirmation = (params: OrderSubmittedEmailParams & { overrideNoteHtml?: string }) => {
  const {
    customerName,
    orderNumber,
    userOrGuestId,
    createdAt,
    items,
    subtotal,
    discountAmount,
    total,
    shippingAddress,
    supportEmail,
    supportPhone,
    userEmail,
    companyName,
    companyLogoUrl,
    orderTrackingLink,
    themeColor,
    overrideNoteHtml,
  } = params;

  // Format date and currency (BDT)
  const orderDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (amount: number) => `৳ ${amount.toFixed(2)}`;

  // Sanitize phone number for WhatsApp Link
  const whatsAppNumber = supportPhone ? supportPhone.replace(/[^0-9]/g, '') : '';

  // Default color if none provided
  const buttonColor = themeColor || '#ff7043';

  // Generate HTML rows for each item
  const itemsHtml = items
    .map(
      (item) => `
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
      </tr>
    `,
    )
    .join('');

  // Handles the dynamic note content while preserving the professional yellow box design
  const noteContent = overrideNoteHtml
    ? `<p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.5;">${overrideNoteHtml}</p>`
    : `<p style="margin: 0; font-size: 14px; color: #333333;">
        <strong>Note:</strong> Your order is currently <strong>pending review by our administrator</strong>. This is a standard step to ensure everything is perfect!
      </p>
      <p style="margin: 10px 0 0; font-size: 14px; color: #333333;">
        You will receive a confirmation email as soon as your order has been approved and is ready for dispatch. Thank you for your understanding and patience!
      </p>`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Confirmation - ${companyName}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; border: 1px solid #dddddd;"
          >
            <tr>
              <td style="padding: 20px; text-align: center;">
                <img
                  src="${companyLogoUrl}"
                  alt="${companyName} Logo"
                  width="160"
                  style="display: block; border: 0;"
                />
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <h2 style="margin: 20px 0 10px; font-size: 22px; color: #333333;">
                  Hello ${customerName},
                </h2>
                <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #555555;">
                  Thank you for shopping with <strong>${companyName}</strong>! We have successfully received your order. Our admin team will review it and update you shortly. Below are the details of your purchase:
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #dddddd;">
                  <thead>
                    <tr style="background-color: #f9f9f9;">
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Order Details</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Order Number:</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${orderNumber}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Viewer ID:</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${userOrGuestId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Order Date:</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${orderDate}</td>
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
                  style="border-collapse: collapse; border: 1px solid #dddddd;"
                >
                  <thead>
                    <tr style="background-color: #f9f9f9;">
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Product</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Name &amp; SKU</th>
                      <th style="padding: 12px; text-align: center; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Qty</th>
                      <th style="padding: 12px; text-align: right; font-size: 14px; color: #333333; border-bottom: 1px solid #dddddd;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 20px 30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #dddddd;">
                  <tbody>
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td colspan="3" style="padding: 10px; font-size: 14px; color: #333333;"><strong>Subtotal</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333; text-align: right; border: 1px solid #d1d5db;">${formatCurrency(subtotal)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td colspan="3" style="padding: 10px; font-size: 14px; color: #333333;"><strong>Discount</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333; text-align: right; border: 1px solid #d1d5db;">-${formatCurrency(discountAmount)}</td>
                    </tr>
                    <tr>
                      <td colspan="3" style="padding: 10px; font-size: 16px; color: #333333;"><strong>Total</strong></td>
                      <td style="padding: 10px; font-size: 16px; color: #333333; text-align: right; border: 1px solid #d1d5db;"><strong>${formatCurrency(total)}</strong></td>
                    </tr>
                  </tbody>
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
                    <tr style="border-bottom: 1px solid #dddddd;">
                      <td colspan="2" style="padding: 10px; font-size: 14px; color: #333333;">
                        <strong>Customer Name:</strong> ${shippingAddress.name}<br/>
                        <strong>Street Address:</strong> ${shippingAddress.street1}<br/>
                        <strong>City &amp; Postal Code:</strong> ${shippingAddress.city}, ${shippingAddress.postalCode}<br/>
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
                <div style="border: 1px solid #ffcc00; background-color: #fffbea; padding: 15px; border-radius: 4px;">
                  ${noteContent}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px; text-align: center;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 20px;">
                  <tr>
                    <td align="center" bgcolor="${buttonColor}" style="border-radius: 5px;">
                      <a
                        href="${orderTrackingLink}"
                        target="_blank"
                        style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;"
                      >
                        Track Your Order
                      </a>
                    </td>
                  </tr>
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
                      href="https://wa.me/${whatsAppNumber}"
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
                    This email was sent to <a href="mailto:${userEmail}" style="color: rgb(33, 47, 243); text-decoration: none;">${userEmail}</a> . This is an Automated Email. Please Do not reply to this email.
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

export default OrderSubmittedConfirmation;
