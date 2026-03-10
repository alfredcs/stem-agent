import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@stem-agent/shared";
/**
 * Creates Express middleware that logs each request/response with pino.
 */
export declare function loggingMiddleware(logger: Logger): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=logging.d.ts.map