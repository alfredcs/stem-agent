import type { Request, Response, NextFunction } from "express";
export interface RateLimitConfig {
    /** Maximum requests per minute. */
    requestsPerMinute: number;
    /** Maximum burst size (token bucket capacity). */
    burst: number;
}
/**
 * Token-bucket rate limiter keyed by authenticated principal ID or client IP.
 */
export declare class RateLimiter {
    private readonly rate;
    private readonly burst;
    private readonly buckets;
    constructor(config: RateLimitConfig);
    /** Express middleware handler. */
    handler: (req: Request, res: Response, next: NextFunction) => void;
    private getKey;
    private allow;
}
//# sourceMappingURL=rate-limit.d.ts.map