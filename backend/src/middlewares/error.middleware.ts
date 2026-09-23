import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      statusCode,
    },
    `Error handling request: ${message}`
  );

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
