import type { Request, Response, NextFunction } from "express";
/**
 * Global error handler middleware.
 * Converts BaseError subclasses to structured JSON responses.
 * Unknown errors return 500.
 */
export declare function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=error-handler.d.ts.map