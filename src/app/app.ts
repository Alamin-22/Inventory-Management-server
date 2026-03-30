import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import { config } from '@config/env';
import { globalErrorHandler, initialMiddlewares } from './middlewares';
import mainRouter from './main-router';
import { AppError } from './classes/AppError';
import { fileCleanupOnError } from './middlewares/fileCleanupOnError';
import mongoose from 'mongoose';

const app = express();
export const server = http.createServer(app);

// Initialize Standard Middlewares (CORS, BodyParser, CookieParser)
initialMiddlewares(app);

// Initialize Socket Server
// export const io = initSocketServer(server, config.clientUrl);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.send({
    message: 'Inventory Management API is Running',
    dbState: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

app.get('/health', (_, res: Response) => {
  res.send('Server is Working properly');
});

// Main API versioned route
app.use(`/api/${config.apiVersion}`, mainRouter);

app.use(fileCleanupOnError);

// Error handling for invalid URLs
app.all('*', (req: Request, _, next: NextFunction) => {
  const error = new AppError(`${req.url} is an invalid url`, 404);
  next(error);
});

// Global error handling middleware
app.use(globalErrorHandler);

export default app;
