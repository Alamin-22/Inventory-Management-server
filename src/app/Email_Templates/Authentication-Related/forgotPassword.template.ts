const ForgotPasswordTemplate = (
  name: string,
  email: string,
  reset_link: string,
  systemName: string = 'Inventory System',
): string => {
  // Generic professional assets for the IMS
  const assets = {
    name: systemName,
    logo: 'https://cdn-icons-png.flaticon.com/512/2830/2830312.png',
    color: '#2563eb', // Professional Blue
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password - ${assets.name}</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f7f7f7;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600"
          style="max-width:600px; background-color:#ffffff; margin:20px auto; padding:10px; font-family: Arial, sans-serif; box-sizing:border-box; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <tr>
            <td align="center" style="padding: 20px 0; border-bottom: 1px solid #eeeeee;">
              <a href="#">
                <img src="${assets.logo}" alt="${assets.name}" style="display:block; width: 64px; height:auto;" />
              </a>
              <h1 style="margin: 10px 0 0 0; font-size: 20px; color: #333;">${assets.name}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 20px;">
              <h2 style="margin:0 0 10px; font-size:20px; color:#333333;">Security Alert: Password Reset</h2>
              
              <p style="margin:0 0 15px; font-size:16px; line-height:1.6; color:#555555;">
                Hello ${name},
              </p>
              
              <p style="margin:0 0 25px; font-size:16px; line-height:1.6; color:#555555;">
                We received a request to reset the password for your staff account. 
                To securely reset your password, please click the button below. This link will expire in <strong>10 minutes</strong>. 
              </p>
    
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 25px;">
                <tr>
                  <td align="center" bgcolor="${assets.color}" style="border-radius:5px;">
                    <a href="${reset_link}" target="_blank"
                      style="display:inline-block; padding:12px 30px; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius: 5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
    
              <p style="margin:0; font-size:14px; line-height:1.5; color:#777777;">
                If the button above doesn't work, copy and paste the following link into your browser:
              </p>
              <p style="margin:10px 0 0; font-size:12px; color:#2563eb; word-break: break-all;">
                <a href="${reset_link}" style="color:${assets.color};">${reset_link}</a>
              </p>
  
              <p style="margin:30px 0 0; font-size:16px; line-height:1.5; color:#555555;">
                If you did not request this reset, please notify your system administrator immediately.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px; background-color: #f9f9f9; text-align:center; font-size:12px; color:#999999; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <p style="margin:0;">
                This secure email was sent to <a href="mailto:${email}" style="color:${assets.color}; text-decoration:none;">${email}</a>.
              </p>
              <p style="margin:5px 0 0;">
                © ${new Date().getFullYear()} ${assets.name}. All Rights Reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export default ForgotPasswordTemplate;
