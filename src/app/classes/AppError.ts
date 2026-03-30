export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public status: string;

  constructor(message: string, statusCode: number = 500, originalError?: Error) {
    super(message);

    this.statusCode = statusCode;
    this.status = String(statusCode)?.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Maintains proper stack trace
    if (originalError?.stack) {
      this.stack = originalError.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
