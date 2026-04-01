import { StockNotificationEmailParams } from './product.email.interface';

const LowStockNotification = (params: StockNotificationEmailParams) => {
  const { sku, productTitle, currentQty, threshold, companyName, companyLogoUrl, clientUrl = '#' } = params;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Low Stock Alert - ${companyName}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding:20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; font-family:Arial, sans-serif; border:1px solid #dddddd;">
            <tr>
              <td style="padding:20px; text-align:center; background-color: #ffffff;">
                ${
                  companyLogoUrl
                    ? `<img src="${companyLogoUrl}" alt="${companyName} Logo" width="140" style="display:block; margin: 0 auto; border:0;" />`
                    : `<h2 style="margin: 0; color: #333333;">${companyName}</h2>`
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 30px; text-align:center;">
                <h2 style="margin:0; font-size:20px; color:#333333;">⚠️ Low Stock Warning</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 20px;">
                <p style="margin:0 0 15px 0; font-size:14px; color:#555555; text-align:center;">
                  The following item has dropped below the threshold (<strong>${threshold}</strong> units):
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px; border-collapse:collapse; border: 1px solid #dddddd;">
                  <tr style="background-color:#f9f9f9;">
                    <td style="padding:10px; font-size:14px; color:#333333; width: 40%; border-bottom: 1px solid #dddddd;"><strong>SKU:</strong></td>
                    <td style="padding:10px; font-size:14px; color:#333333; border-bottom: 1px solid #dddddd;">${sku}</td>
                  </tr>
                  <tr style="background-color:#ffffff;">
                    <td style="padding:10px; font-size:14px; color:#333333; border-bottom: 1px solid #dddddd;"><strong>Product:</strong></td>
                    <td style="padding:10px; font-size:14px; color:#333333; border-bottom: 1px solid #dddddd;">${productTitle}</td>
                  </tr>
                  <tr style="background-color:#fffbeb;">
                    <td style="padding:10px; font-size:14px; color:#333333;"><strong>Current Stock:</strong></td>
                    <td style="padding:10px; font-size:14px; color:#d97706; font-weight:bold;">${currentQty} unit(s)</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 30px; text-align:center;">
                <a href="${clientUrl}" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#ffffff; background-color:#f59e0b; border-radius:5px; text-decoration:none;" target="_blank">
                  Manage Inventory
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 30px; text-align:center; font-size:12px; color:#999999; border-top: 1px solid #eeeeee;">
                ${companyName} Automated IMS Notification.<br />
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

export default LowStockNotification;
