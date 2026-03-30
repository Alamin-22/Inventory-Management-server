import nodemailer from 'nodemailer';
import { config } from '../config/env';

// Define valid brands
export type EmailBrand = 'bringByAir' | 'pandaBD';

export const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  brand: EmailBrand = 'bringByAir', // Default to your main brand
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[],
) => {
  const toList = Array.isArray(to) ? to.join(',') : to;

  // 1.  DYNAMIC SWITCH: Select credentials based on Brand
  const emailConfig = config.smtpCredential[brand];

  if (!emailConfig || !emailConfig.user || !emailConfig.pass) {
    throw new Error(`Missing SMTP credentials for brand: ${brand}`);
  }

  // 2. Create Transporter with Selected Creds
  const smtpTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailConfig.user, // Dynamic User
      pass: emailConfig.pass, // Dynamic Pass
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    // 3. Verify connection (Optional, might slow down bulk sending)
    // await smtpTransporter.verify();

    // 4. Send mail
    const sendResult = await smtpTransporter.sendMail({
      from: emailConfig.from, // Use the brand's verified email
      to: toList,
      subject,
      text: html.replace(/<(?:.|\n)*?>/gm, ''),
      html,
      attachments,
    });

    console.log(`📧 [${brand.toUpperCase()}] Email sent to: ${toList} | MsgID: ${sendResult.messageId}`);
    return !!sendResult.messageId;
  } catch (err) {
    console.error(`❌ [${brand.toUpperCase()}] Error sending email to:`, toList);
    console.error(err);
    throw err;
  }
};
