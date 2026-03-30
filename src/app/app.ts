import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import { config } from '@config/env';
import { globalErrorHandler, initialMiddlewares } from './middlewares';
import { tenantResolver } from './middlewares/tenantResolver';
import { initSocketServer } from './modules/socket';
import mainRouter from './main-router';
import { AppError } from './classes/AppError';
import { fileCleanupOnError } from './middlewares/fileCleanupOnError';

const app = express();
export const server = http.createServer(app);

// Initialize Standard Middlewares (CORS, BodyParser, CookieParser)
initialMiddlewares(app);

// Initialize Tenant Resolver (Must be BEFORE routes)
// This attaches req.dbConnection and req.brand to every request
app.use(tenantResolver);

//  Initialize Socket Server
// Note: Currently defaulting to BBA URL. We can make this dynamic later if needed.
export const io = initSocketServer(server, config.client.bringByAir.url, config.redisUrl);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.send({
    message: 'Dual-Core Server is Running',
    connectedBrand: req.brand,
    dbState: req.dbConnection?.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

app.get('/health', (_, res: Response) => {
  res.send('Server is Working properly');
});

//  this is the main api versioned route
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
