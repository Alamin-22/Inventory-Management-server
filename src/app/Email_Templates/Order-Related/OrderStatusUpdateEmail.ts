import { OrderStatusUpdateEmailParams } from './oder.email.interface';

const OrderStatusUpdateEmail = (params: OrderStatusUpdateEmailParams) => {
  const {
    customerName,
    orderNumber,
    items,
    updateTitle,
    updateMessage,
    companyName,
    companyLogoUrl,
    supportEmail,
    supportPhone,
    orderTrackingLink,
    themeColor,
  } = params;

  const brandColor = themeColor || '#2563EB';

  const whatsAppNumber = supportPhone ? supportPhone.replace(/[^0-9]/g, '') : '';

  // Generate Items Summary HTML (Compact view)
  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 12px 0; width: 60px; vertical-align: top;">
           <img 
             src="${item.imageUrl}" 
             alt="${item.title}" 
             width="50" 
             style="display: block; border-radius: 4px; border: 1px solid #eeeeee;" 
           />
        </td>
        <td style="padding: 12px 15px; text-align: left; vertical-align: top;">
           <p style="margin: 0; font-size: 14px; color: #333333; font-weight: 600;">${item.title}</p>
           <p style="margin: 4px 0 0; font-size: 12px; color: #777777;">SKU: ${item.sku}</p>
        </td>
        <td style="padding: 12px 0; text-align: right; vertical-align: top; white-space: nowrap;">
           <span style="font-size: 13px; color: #555555;">Qty: ${item.quantity}</span>
        </td>
      </tr>
    `,
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Status Update - ${companyName}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">
            
            <tr>
              <td style="padding: 30px 40px; border-bottom: 1px solid #eeeeee; text-align: left;">
                <img 
                  src="${companyLogoUrl}" 
                  alt="${companyName}" 
                  height="40" 
                  style="display: block; height: 40px; width: auto;" 
                />
              </td>
            </tr>

            <tr>
              <td style="padding: 40px 40px 20px;">
                
                <h2 style="margin: 0 0 15px; font-size: 20px; color: #111827; font-weight: 700;">
                  Hello ${customerName},
                </h2>
                <p style="margin: 0 0 25px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  We have an important update regarding your order <strong style="color: #111827;">#${orderNumber}</strong>.
                </p>

                <div style="
                  background-color: #f9fafb; 
                  border: 1px solid #e5e7eb; 
                  border-left: 4px solid ${brandColor}; 
                  padding: 20px; 
                  border-radius: 4px;
                  margin-bottom: 30px;
                ">
                  <h3 style="margin: 0 0 8px; color: ${brandColor}; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${updateTitle}
                  </h3>
                  <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
                    ${updateMessage}
                  </p>
                </div>

                <div style="margin-bottom: 30px;">
                  <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;">
                    You can view the full details and track your package securely by visiting this link:
                  </p>
                  <div style="background-color: #f0f9ff; padding: 12px; border-radius: 4px; border: 1px dashed ${brandColor}; word-break: break-all;">
                    <a href="${orderTrackingLink}" target="_blank" style="
                      font-size: 14px; 
                      color: ${brandColor}; 
                      text-decoration: none; 
                      font-weight: 500;
                    ">
                      ${orderTrackingLink}
                    </a>
                  </div>
                </div>

                <div style="border-top: 1px solid #eeeeee; padding-top: 25px;">
                  <h4 style="margin: 0 0 15px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">
                    Order Summary
                  </h4>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${itemsHtml}
                  </table>
                </div>

              </td>
            </tr>

            <tr>
              <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #eeeeee;">
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: top; padding-bottom: 20px;">
                      <p style="margin: 0 0 5px; font-size: 14px; font-weight: 600; color: #374151;">Need Assistance?</p>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                        Email: <a href="mailto:${supportEmail}" style="color: ${brandColor}; text-decoration: none;">${supportEmail}</a><br/>
                        Phone: <a href="tel:${supportPhone}" style="color: ${brandColor}; text-decoration: none;">${supportPhone}</a>
                      </p>
                    </td>
                    <td style="vertical-align: top; text-align: right;">
                       <a href="https://wa.me/${whatsAppNumber}" target="_blank" style="text-decoration: none; display: inline-block;">
                         <img 
                           src="https://res.cloudinary.com/dydv6uxzo/image/upload/v1753341562/ReLoved_Gadget/Assets/icons/whatsapp-icon_fml5kj.png" 
                           alt="WhatsApp" 
                           width="32" 
                           height="32" 
                           style="display: block;"
                         />
                       </a>
                    </td>
                  </tr>
                </table>

                <div style="border-top: 1px solid #e5e7eb; margin-top: 20px; padding-top: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    &copy; ${new Date().getFullYear()} ${companyName}. All Rights Reserved.
                  </p>
                </div>

              </td>
            </tr>

          </table>
          
          <p style="margin: 20px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
             This is an automated status update for your order.
          </p>
          
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export default OrderStatusUpdateEmail;
