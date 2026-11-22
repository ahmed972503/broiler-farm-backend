import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("[API Error]:", err);

  // Duplicate key error (Postgres 23505 or legacy 11000)
  if (err.code === 11000 || err.code === "23505") {
    const fields = Object.keys(err.keyValue || {});
    res.status(409).json({
      success: false,
      error: fields.length > 0 ? `Duplicate entry for ${fields.join(", ")}: already exists` : (err.detail || "Duplicate record already exists"),
      fields: err.keyValue,
    });
    return;
  }

  // CastError or invalid format
  if (err.name === "CastError") {
    res.status(400).json({
      success: false,
      error: `Invalid format for field ${err.path}`,
    });
    return;
  }

  // Custom known error status
  const statusCode =
    err.statusCode ||
    (err.status >= 400 && err.status < 600 ? err.status : 500);
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal server error",
  });
}
