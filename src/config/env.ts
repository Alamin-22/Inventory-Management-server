import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'env/.env') });

export const config = {
  port: (process.env.PORT || '5000') as string,

  bringByAirMongoUri: process.env.Bring_By_Air_MONGO_URI as string,
  pandaBDMongoUri: process.env.PandaBD_MONGO_URI as string,

  // this is the dynamic config of SMTP for both Store BBA and PandaBD
  smtpCredential: {
    bringByAir: {
      user: process.env.BBA_SMTP_USER as string,
      pass: process.env.BBA_SMTP_PASS as string,
      from: 'Bring By Air <noreply@bringbyair.com>',
    },
    pandaBD: {
      user: process.env.PandaBD_SMTP_USER as string,
      pass: process.env.PandaBD_SMTP_PASS as string,
      from: 'PandaBD <noreply@pandabd.com>',
    },
  },

  //
  environment: process.env.NODE_ENV as string,

  // Client Config
  client: {
    bringByAir: {
      url: process.env.BBA_CLIENT_URL as string,
      domain: process.env.BBA_DOMAIN as string,
      companyName: process.env.BBA_COMPANY_NAME || 'Bring By Air',
      logoUrl: process.env.BBA_LOGO_URL || '',
      adminEmails: (process.env.BBA_ADMIN_EMAILS || '').split(','),
    },
    pandaBD: {
      url: process.env.PANDA_CLIENT_URL as string,
      domain: process.env.PANDA_DOMAIN as string,
      companyName: process.env.PANDA_COMPANY_NAME || 'PandaBD',
      logoUrl: process.env.PANDA_LOGO_URL || '',
      adminEmails: (process.env.PANDA_ADMIN_EMAILS || '').split(','),
    },
  },

  // Payment Configuration
  paymentConfig: {
    amarPay: {
      bringByAir: {
        storeId: process.env.BBA_AMAR_PAY_STORE_ID || 'aamarpaytest',
        signatureKey: process.env.BBA_AMAR_PAY_SIGNATURE_KEY || 'dbb74894e82415a2f7ff0ec3a97e4183',
        baseUrl: process.env.BBA_AMAR_PAY_BASE_URL || 'https://sandbox.aamarpay.com',
      },
      pandaBD: {
        storeId: process.env.PANDA_AMARPAY_STORE_ID || 'aamarpaytest',
        signatureKey: process.env.PANDA_AMARPAY_SIGNATURE_KEY || 'dbb74894e82415a2f7ff0ec3a97e4183',
        baseUrl: process.env.PANDA_AMARPAY_BASE_URL || 'https://sandbox.aamarpay.com',
      },
    },

    stripe: {
      bringByAir: {
        secretKey: process.env.BBA_STRIPE_SECRET_KEY as string,
        publishableKey: process.env.BBA_STRIPE_PUBLISHABLE_KEY as string,
        webhookSecret: process.env.BBA_STRIPE_WEBHOOK_SECRET as string,
      },
      pandaBD: {
        secretKey: process.env.PANDA_STRIPE_SECRET_KEY as string,
        publishableKey: process.env.PANDA_STRIPE_PUBLISHABLE_KEY as string,
        webhookSecret: process.env.PANDA_STRIPE_WEBHOOK_SECRET as string,
      },
    },
  },
  refund_processing_fee_percentage: process.env.REFUND_PROCESSING_FEE_PERCENTAGE,



  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET as string,
  cartTokenSecret: process.env.CART_TOKEN_SECRET as string,

  cloudinaryConfig: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_access_secret: process.env.CLOUDINARY_API_SECRET as string,
  },

  backend_api_url: process.env.BACKEND_API_URL,
  apiVersion: process.env.API_VERSION as string,
  redisUrl: process.env.UPSTASH_REDIS_URL as string,

  superAdminEmail: process.env.SUPER_ADMIN_EMAIL as string,
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD as string,

  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,

  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN as string,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN as string,
};
