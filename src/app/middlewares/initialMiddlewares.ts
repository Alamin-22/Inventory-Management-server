import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from '@config/env';
import { sanitizeData } from '@utils/sanitize';

const allowedOrigins = [
  'http://localhost:3000',
  // 'http://localhost:5173',

  config.clientUrl,
];

export const initialMiddlewares = (app: Express): void => {
  // Handle preflight requests
  app.options('*', cors({ origin: allowedOrigins, credentials: true }));

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Global Security Middleware for XSS/NoSQL Injection prevention
  app.use((req, _res, next) => {
    req.body = sanitizeData(req.body);
    req.query = sanitizeData(req.query);
    req.params = sanitizeData(req.params);
    next();
  });
};
