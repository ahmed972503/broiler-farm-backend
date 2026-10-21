import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
        return;
      }
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
        return;
      }
      next(err);
    }
  };
}
