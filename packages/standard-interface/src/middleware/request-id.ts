import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Middleware that assigns a unique X-Request-Id to every request.
 * If the client sends one, it is preserved; otherwise a UUID is generated.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id =
    (req.headers["x-request-id"] as string | undefined) ?? uuidv4();
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-Id", id);
  next();
}
