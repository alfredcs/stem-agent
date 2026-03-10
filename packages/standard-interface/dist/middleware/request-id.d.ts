import type { Request, Response, NextFunction } from "express";
/**
 * Middleware that assigns a unique X-Request-Id to every request.
 * If the client sends one, it is preserved; otherwise a UUID is generated.
 */
export declare function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=request-id.d.ts.map