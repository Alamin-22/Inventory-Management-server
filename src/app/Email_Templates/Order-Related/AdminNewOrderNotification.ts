import { AdminNewOrderEmailParams } from './oder.email.interface';

const AdminNewOrderNotification = (params: AdminNewOrderEmailParams) => {
  const {
    orderNumber,
    userOrGuestId,
    customerName,
    orderDate,
    total,
    itemCount,
    adminDashboardLink,
    companyName,
    companyLogoUrl,
    themeColor,
  } = params;

  // Format date into readable string
  const formattedDate = new Date(orderDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    timeZone: 'Asia/Dhaka',
  });

  // Format total amount in BDT
  const formatCurrency = (amount: number) => `৳ ${amount.toFixed(2)}`;

  const buttonColor = themeColor || '#10b981';

  const orderContextLabel = orderNumber.startsWith('PRE') ? 'Pre-Order Slot' : 'Standard Order';

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Order Alert - ${companyName}</title>
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
              <td style="padding: 15px; text-align: center;">
                <img
                  src="${companyLogoUrl}"
                  alt="${companyName} Logo"
                  width="140"
                  style="display: block; border: 0; margin: 0 auto;"
                />
              </td>
            </tr>

            <tr>
              <td style="padding: 20px 30px 10px;">
                <h2 style="margin: 0; font-size: 20px; color: #333333; text-align: center;">
                  🔔 New Order Received
                </h2>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <p style="margin: 0; font-size: 14px; color: #555555; text-align: center;">
                  A new order has been placed on <strong>${companyName}</strong>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #dddddd;">
                  <tbody>
                    <tr style="background-color: #f9f9f9;">
                      <td style="padding: 10px; font-size: 14px; color: #333333; width: 40%;"><strong>Store</strong></td>
                      <td style="padding: 10px; font-size: 14px; font-weight: bold; color: ${buttonColor};">${companyName}</td>
                    </tr>
                    
                    <tr style="border-top: 1px solid #dddddd; background-color: #ffffff;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Order Context</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333; font-weight: bold;">${orderContextLabel}</td>
                    </tr>

                    <tr style="border-top: 1px solid #dddddd; background-color: #f9f9f9;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Order Number</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${orderNumber}</td>
                    </tr>
                    
                    <tr style="border-top: 1px solid #dddddd; background-color: #ffffff;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Customer Name</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${customerName}</td>
                    </tr>
                    
                    <tr style="border-top: 1px solid #dddddd; background-color: #f9f9f9;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Customer ID</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${userOrGuestId}</td>
                    </tr>
                    
                    <tr style="border-top: 1px solid #dddddd; background-color: #ffffff;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Order Date</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${formattedDate}</td>
                    </tr>
                    
                    <tr style="border-top: 1px solid #dddddd; background-color: #f9f9f9;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Items</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;">${itemCount} item(s)</td>
                    </tr>
                    
                    <tr style="border-top: 1px solid #dddddd; background-color: #ffffff;">
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>Total Amount</strong></td>
                      <td style="padding: 10px; font-size: 14px; color: #333333;"><strong>${formatCurrency(total)}</strong></td>
                    </tr>
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
                        href="${adminDashboardLink}"
                        target="_blank"
                        style="display: inline-block; padding: 10px 18px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;"
                      >
                        View in Dashboard
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 20px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #777777;">
                  ${companyName} Admin Notification — Automated Email
                </p>
                <p style="margin: 5px 0 0; font-size: 12px; color: #777777;">
                  Do not reply to this email.
                </p>
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

export default AdminNewOrderNotification;
