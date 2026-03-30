interface TContactUsTemplateProps {
  name: string;
  contactNumber: string;
  email: string;
  subject: string;
  message: string;
  companyName: string;
  companyLogo: string;
  themeColor?: string;
}

const ContactUsNotificationTemplate = ({
  name,
  contactNumber,
  email,
  subject,
  message,
  companyName,
  companyLogo,
  themeColor,
}: TContactUsTemplateProps) => {
  const brandColor = themeColor || '#007BFF';

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Contact Us Submission</title>
  </head>
  <body style="margin:0; padding:0; background:#f2f2f2; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr><td align="center">
        <table width="600" style="background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden;">
          
          <tr>
            <td style="padding:20px; border-bottom:1px solid #e0e0e0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,sans-serif; font-size:20px; color:${brandColor};">
                    <strong>New Contact Request</strong>
                  </td>
                  <td align="right">
                    <img src="${companyLogo}" alt="${companyName} Logo" style="max-width:120px; height:auto; display:block;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px;">
              <p style="font-family:Arial,sans-serif; font-size:16px; color:#555; line-height:1.5; margin-top:0;">
                You have received a new contact request from <strong>${name}</strong>. Here are the details:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:15px; border: 1px solid #e0e0e0;">
                ${[
                  { label: 'Name', value: name },
                  { label: 'Contact Number', value: contactNumber },
                  {
                    label: 'Email Address',
                    value: `<a href="mailto:${email}" style="color:${brandColor}; text-decoration:none;">${email}</a>`,
                  },
                  { label: 'Subject', value: subject },
                ]
                  .map(
                    (row, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#f9fafb' : '#ffffff'};">
                  <td style="padding:12px; border-bottom:1px solid #e0e0e0; font-family:Arial,sans-serif; font-size:14px; color:#333; width: 30%;">
                    <strong>${row.label}</strong>
                  </td>
                  <td style="padding:12px; border-bottom:1px solid #e0e0e0; font-family:Arial,sans-serif; font-size:14px; color:#555;">
                    ${row.value}
                  </td>
                </tr>`,
                  )
                  .join('')}
              </table>

              <div style="margin-top:25px;">
                <strong style="font-family:Arial,sans-serif; font-size:14px; color:#333; text-transform:uppercase;">Message</strong>
                <div style="margin-top:8px; padding:15px; background:#f4f4f4; border-left: 4px solid ${brandColor}; border-radius:4px;">
                  <p style="font-family:Arial,sans-serif; font-size:15px; color:#333; line-height:1.6; margin:0; white-space: pre-wrap;">
                    ${message}
                  </p>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:15px; text-align:center; background:#f9fafb; border-top:1px solid #e0e0e0;">
              <p style="font-family:Arial,sans-serif; font-size:12px; color:#999; margin:0;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
`;
};

export default ContactUsNotificationTemplate;
