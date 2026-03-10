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
export class RateLimiter {
  private readonly rate: number;
  private readonly burst: number;
  private readonly buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(config: RateLimitConfig) {
    this.rate = config.requestsPerMinute;
    this.burst = config.burst;
  }

  /** Express middleware handler. */
  handler = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.getKey(req);
    if (this.allow(key)) {
      next();
    } else {
      res.status(429).json({ error: "Rate limit exceeded" });
    }
  };

  private getKey(req: Request): string {
    const principal = (req as unknown as Record<string, unknown>).principal as
      | { id: string }
      | undefined;
    if (principal?.id) return `principal:${principal.id}`;
    return `ip:${req.ip ?? "unknown"}`;
  }

  private allow(key: string): boolean {
    const now = performance.now() / 1000; // seconds
    const bucket = this.buckets.get(key) ?? {
      tokens: this.burst,
      lastRefill: now,
    };

    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(
      this.burst,
      bucket.tokens + elapsed * (this.rate / 60),
    );
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.buckets.set(key, bucket);
      return true;
    }

    this.buckets.set(key, bucket);
    return false;
  }
}
