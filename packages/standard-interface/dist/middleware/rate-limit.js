"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * Token-bucket rate limiter keyed by authenticated principal ID or client IP.
 */
class RateLimiter {
    rate;
    burst;
    buckets = new Map();
    constructor(config) {
        this.rate = config.requestsPerMinute;
        this.burst = config.burst;
    }
    /** Express middleware handler. */
    handler = (req, res, next) => {
        const key = this.getKey(req);
        if (this.allow(key)) {
            next();
        }
        else {
            res.status(429).json({ error: "Rate limit exceeded" });
        }
    };
    getKey(req) {
        const principal = req.principal;
        if (principal?.id)
            return `principal:${principal.id}`;
        return `ip:${req.ip ?? "unknown"}`;
    }
    allow(key) {
        const now = performance.now() / 1000; // seconds
        const bucket = this.buckets.get(key) ?? {
            tokens: this.burst,
            lastRefill: now,
        };
        const elapsed = now - bucket.lastRefill;
        bucket.tokens = Math.min(this.burst, bucket.tokens + elapsed * (this.rate / 60));
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
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rate-limit.js.map