export const verificationEmailTemplate = (
  name: string,
  verificationLink: string,
  companyName: string,
  companyLogoUrl: string,
  supportEmail: string,
  supportPhone: string,
  clientUrl: string,
  themeColor: string,
): string => {
  const currentYear = new Date().getFullYear();
  const brandColor = themeColor || '#007BFF';
  const sanitizedPhone = supportPhone.replace(/[^0-9]/g, '');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Verify Your Email</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style type="text/css">
    body { margin: 0; padding: 0; min-width: 100%; background-color: #f4f6f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; border-spacing: 0; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    a { text-decoration: none; }
    
    @media only screen and (max-width: 599px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 30px 20px !important; }
      .mobile-center { text-align: center !important; }
    }
  </style>
</head>
<body style="background-color: #f4f6f8;">
  <div style="background-color: #f4f6f8; padding: 40px 0;">
    <table class="container" width="600" align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden;">
      
      <tr>
        <td align="left" style="padding: 40px 0 30px; border-bottom: 1px solid #eeeeee;">
          <a href="${clientUrl}" target="_blank">
            <img src="${companyLogoUrl}" alt="${companyName}" width="150" style="display: block; font-family: Arial, sans-serif; color: #333333; font-size: 16px; font-weight: bold;" />
          </a>
        </td>
      </tr>

      <tr>
        <td class="content-padding" style="padding: 40px 50px;">
          <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: left;" class="mobile-center">
            Verify your email address
          </h1>
          
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a4a4a; text-align: left;" class="mobile-center">
            Hi <strong>${name}</strong>,
          </p>
          
          <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a4a4a; text-align: left;" class="mobile-center">
            Thanks for creating an account with <strong>${companyName}</strong>. To complete your registration and secure your account, please verify your email address by clicking the button below.
          </p>

          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="left" class="mobile-center">
                <a href="${verificationLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: ${brandColor}; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  Verify Email Address
                </a>
              </td>
            </tr>
          </table>

          <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.5; color: #777777; text-align: left;" class="mobile-center">
            If you're having trouble clicking the button, copy and paste the URL below into your web browser:
          </p>
         <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; text-align: left;" class="mobile-center">
         <a href="${verificationLink}" 
             onmouseover="this.style.textDecoration='underline'" 
             onmouseout="this.style.textDecoration='none'" 
             style="color: ${brandColor}; word-break: break-all; text-decoration: none;">
             ${verificationLink}
         </a>
        </p>

        </td>
      </tr>

      <tr>
        <td style="background-color: #fafafa; padding: 30px 50px; border-top: 1px solid #eeeeee;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #777777; text-align: center;">
            <strong>Need assistance?</strong>
          </p>
          <p style="margin: 0 0 20px; font-size: 14px; color: #777777; text-align: center;">
            Contact us at <a href="mailto:${supportEmail}" style="color: ${brandColor}; text-decoration: none;">${supportEmail}</a> or call <a href="tel:${sanitizedPhone}" style="color: ${brandColor}; text-decoration: none;">${supportPhone}</a>
          </p>
          
          <div style="border-top: 1px solid #e0e0e0; margin: 20px 0;"></div>
          
          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #999999; text-align: center;">
            You received this email because you signed up for ${companyName}.<br/>
            If you did not make this request, you can safely ignore this email.
          </p>
          <p style="margin: 10px 0 0; font-size: 12px; color: #999999; text-align: center;">
            &copy; ${currentYear} ${companyName}. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
    
    <table width="100%" height="40" border="0" cellpadding="0" cellspacing="0"><tr><td></td></tr></table>
  </div>
</body>
</html>
  `;
};
