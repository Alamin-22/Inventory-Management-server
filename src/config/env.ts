import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'env/.env') });

export const config = {
  port: (process.env.PORT || '5000') as string,
  environment: process.env.NODE_ENV as string,

  //  Database Config
  mongoUri: process.env.MONGO_URI as string,

  // Admin Config (For Restock Queues & Internal Alerts)
  admin: {
    notificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL as string,
  },

  // Client config
  client: {
    companyName: process.env.COMPANY_NAME as string,
    logoUrl: process.env.LOGO_URL as string,
    supportEmail: process.env.SUPPORT_EMAIL as string,
    supportPhone: process.env.SUPPORT_PHONE as string,
    url: process.env.CLIENT_URL as string,
    domain: process.env.DOMAIN as string,
  },

  // SMTP Config
  smtpCredential: {
    user: process.env.SMTP_USER as string,
    pass: process.env.SMTP_PASS as string,
    receiverEmail: process.env.RECEIVER_EMAIL as string,
  },

  // Authentication & Tokens
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET as string,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET as string,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN as string,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN as string,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,

  // Admin Setup
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL as string,
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD as string,

  // Cloudinary Config
  cloudinaryConfig: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_access_secret: process.env.CLOUDINARY_API_SECRET as string,
  },

  // API Config
  backendApiUrl: process.env.BACKEND_API_URL as string,
  apiVersion: process.env.API_VERSION as string,
};
