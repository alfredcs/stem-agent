import type { Request, Response, NextFunction } from "express";
import { BaseError } from "@stem-agent/shared";

/**
 * Global error handler middleware.
 * Converts BaseError subclasses to structured JSON responses.
 * Unknown errors return 500.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof BaseError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  res.status(500).json({
    name: "InternalServerError",
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    statusCode: 500,
    details: {},
  });
}
