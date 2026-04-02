import nodemailer from 'nodemailer';
import { config } from '../config/env';

export const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[],
) => {
  const toList = Array.isArray(to) ? to.join(',') : to;

  if (!config.smtpCredential.user || !config.smtpCredential.pass) {
    console.error('Missing SMTP credentials in environment variables.');
    return false; // Fail gracefully so it doesn't crash the Order creation
  }

  const smtpTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: config.smtpCredential.user,
      pass: config.smtpCredential.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    //  Send mail
    const sendResult = await smtpTransporter.sendMail({
      from: `"${config.client.companyName}" <${config.smtpCredential.user}>`,
      to: toList,
      subject,
      text: html.replace(/<(?:.|\n)*?>/gm, ''), // Strip HTML tags for the plaintext fallback
      html,
      attachments, // The PDF buffer
    });

    console.log(`📧 [IMS] Email sent to: ${toList} | MsgID: ${sendResult.messageId}`);
    return !!sendResult.messageId;
  } catch (err) {
    console.error(`❌ [IMS] Error sending email to:`, toList);
    console.error(err);
    return false;
  }
};
