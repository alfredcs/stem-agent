import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { RateLimiter } from "../middleware/rate-limit.js";

function createTestApp(limiter: RateLimiter) {
  const app = express();
  app.use(limiter.handler);
  app.get("/test", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("RateLimiter", () => {
  it("allows requests within the limit", async () => {
    const limiter = new RateLimiter({ requestsPerMinute: 60, burst: 5 });
    const app = createTestApp(limiter);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/test");
      expect(res.status).toBe(200);
    }
  });

  it("rejects requests exceeding burst", async () => {
    const limiter = new RateLimiter({ requestsPerMinute: 60, burst: 2 });
    const app = createTestApp(limiter);

    // Use burst
    await request(app).get("/test");
    await request(app).get("/test");

    // Third request should be rate limited
    const res = await request(app).get("/test");
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("Rate limit exceeded");
  });
});
