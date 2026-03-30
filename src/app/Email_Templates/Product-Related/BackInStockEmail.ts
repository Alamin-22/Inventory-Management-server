import { BackInStockEmailParams } from './product.email.interface';

export const BackInStockEmail = (params: BackInStockEmailParams) => {
  const {
    customerName,
    productTitle,
    productImageUrl,
    productUrl,
    variantSku,
    companyName,
    companyLogoUrl,
    supportEmail,
  } = params;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>It's Back in Stock! - ${companyName}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #dddddd;">
            <!-- Header with Logo -->
            <tr>
              <td style="padding: 20px; text-align: center;">
                <img src="${companyLogoUrl}" alt="${companyName} Logo" width="160" style="display: block; border: 0;" />
              </td>
            </tr>

            <!-- Greeting & Main Message -->
            <tr>
              <td style="padding: 0 30px 20px;">
                <h2 style="margin: 20px 0 10px; font-size: 22px; color: #333333;">Good News, ${customerName}!</h2>
                <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #555555;">
                  The product you've been waiting for is finally back in stock. Act fast before it's gone again!
                </p>
              </td>
            </tr>

            <!-- Product Details -->
            <tr>
              <td style="padding: 0 30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #dddddd;">
                  <tr style="border-bottom: 1px solid #dddddd;">
                    <td style="padding: 12px; text-align: center; width: 100px;">
                      <img src="${productImageUrl}" alt="${productTitle}" width="80" style="display: block; border: 0; margin: 0 auto;" />
                    </td>
                    <td style="padding: 12px; font-size: 14px; color: #333333;">
                      <strong style="font-size: 16px;">${productTitle}</strong><br />
                      <span style="color: #777777; font-size: 12px;">SKU: ${variantSku}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Call to Action Button -->
            <tr>
              <td style="padding: 0 30px 30px; text-align: center;">
                <a href="${productUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #ff7043; border: 1px solid #ff7043; text-decoration: none; border-radius: 5px;">
                    View Product & Purchase
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 30px; text-align: center; background-color: #f9f9f9;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px;">
                  If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color: #2a7ae2; text-decoration: none;">${supportEmail}</a>.
                </p>
                <p style="font-size: 12px; color: #999999;">
                  You are receiving this email because you requested to be notified when this product is back in stock.
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
