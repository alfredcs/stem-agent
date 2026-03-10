import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@stem-agent/shared";

/**
 * Creates Express middleware that logs each request/response with pino.
 */
export function loggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const requestId = req.headers["x-request-id"] as string | undefined;

    res.on("finish", () => {
      logger.info(
        {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
          requestId,
        },
        "request completed",
      );
    });

    next();
  };
}
