import { StockNotificationEmailParams } from './product.email.interface';

const OutOfStockNotification = (params: StockNotificationEmailParams) => {
  const { sku, productTitle, companyName, companyLogoUrl, adminDashboardLink } = params;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Out of Stock Alert - ${companyName}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; font-family:Arial, sans-serif; border:1px solid #dddddd;">
            <tr>
              <td style="padding:15px; text-align:center; background-color: #ffffff;">
                <img src="${companyLogoUrl}" alt="${companyName}" width="140" style="display:block; margin: 0 auto; border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:20px 30px; text-align:center;">
                <h2 style="margin:0; font-size:20px; color:#dc2626;">⚠️ Product Out of Stock</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 20px;">
                <p style="margin:0 0 15px 0; font-size:14px; color:#555555; text-align:center;">
                  Action Required: The following item has reached <strong>0</strong> quantity.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px; border-collapse:collapse;">
                  <tr style="background-color:#f9f9f9;">
                    <td style="padding:10px; font-size:14px; color:#333333; width: 40%;"><strong>SKU:</strong></td>
                    <td style="padding:10px; font-size:14px; color:#333333;">${sku}</td>
                  </tr>
                  <tr style="border-top:1px solid #dddddd; background-color:#ffffff;">
                    <td style="padding:10px; font-size:14px; color:#333333;"><strong>Product:</strong></td>
                    <td style="padding:10px; font-size:14px; color:#333333;">${productTitle}</td>
                  </tr>
                  <tr style="border-top:1px solid #dddddd; background-color:#fef2f2;">
                    <td style="padding:10px; font-size:14px; color:#333333;"><strong>Status:</strong></td>
                    <td style="padding:10px; font-size:14px; color:#dc2626; font-weight:bold;">OUT OF STOCK</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 20px; text-align:center;">
                <a href="${adminDashboardLink}" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#ffffff; background-color:#dc2626; border-radius:5px; text-decoration:none;" target="_blank">
                  Restock Now
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 30px; text-align:center; font-size:12px; color:#999999; border-top: 1px solid #eeeeee;">
                ${companyName} Automated Notification.<br />
                Please do not reply to this email.
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

export default OutOfStockNotification;
