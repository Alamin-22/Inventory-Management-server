import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from '@config/env';
import { handleStripeWebhook } from '@app/modules/Payment-Related/Payment/Payment.webhook';
import { sanitizeData } from '@utils/sanitize';

const allowedOrigins = [
  // Localhost
  'http://localhost:3000', // Bring By Air
  'http://localhost:3001', // PandaBD

  // Bring By Air Production
  config.client.bringByAir.url, // https://bringbyair.com
  'https://www.bringbyair.com',
  'http://bringbyair.com',
  'http://www.bringbyair.com',

  // PandaBD Production
  config.client.pandaBD.url, // https://pandabd.com
  'https://www.pandabd.com',
  'http://pandabd.com',
  'http://www.pandabd.com',
];

export const initialMiddlewares = (app: Express): void => {
  // Handle preflight requests first
  app.options(
    '*',
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  /** * 2. THE WEBHOOK RULE:
   * This MUST come before app.use(express.json())
   * We use express.raw because Stripe needs the exact original bytes to verify the signature.
   */
  app.post('/api/v1/payments/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Global Security Middleware
  app.use((req, _res, next) => {
    req.body = sanitizeData(req.body);
    req.query = sanitizeData(req.query);
    req.params = sanitizeData(req.params);
    next();
  });
};
