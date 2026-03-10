import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { AuthMiddleware } from "../auth/auth-middleware.js";
import { ApiKeyProvider } from "../auth/api-key-provider.js";
import { JwtProvider } from "../auth/jwt-provider.js";
import { createHmac } from "node:crypto";

function createTestApp(authMiddleware: AuthMiddleware) {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware.handler);
  app.get("/protected", (req: any, res) => {
    res.json({ principal: req.principal ?? null });
  });
  app.get("/public", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("AuthMiddleware", () => {
  it("passes through when auth is disabled", async () => {
    const mw = new AuthMiddleware({ enabled: false });
    const app = createTestApp(mw);

    const res = await request(app).get("/protected");
    expect(res.status).toBe(200);
    expect(res.body.principal).toBeNull();
  });

  it("allows public paths without credentials", async () => {
    const mw = new AuthMiddleware({ enabled: true, publicPaths: ["/public"] });
    const app = createTestApp(mw);

    const res = await request(app).get("/public");
    expect(res.status).toBe(200);
  });

  it("returns 401 when no credential is provided", async () => {
    const mw = new AuthMiddleware({ enabled: true });
    const app = createTestApp(mw);

    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing authentication");
  });

  it("returns 401 for invalid API key", async () => {
    const mw = new AuthMiddleware({ enabled: true });
    mw.addProvider(
      new ApiKeyProvider({ keys: { "valid-key": { id: "user-1" } } }),
    );
    const app = createTestApp(mw);

    const res = await request(app)
      .get("/protected")
      .set("X-API-Key", "bad-key");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("authenticates with valid API key", async () => {
    const mw = new AuthMiddleware({ enabled: true });
    mw.addProvider(
      new ApiKeyProvider({
        keys: { "valid-key": { id: "user-1", roles: ["admin"] } },
      }),
    );
    const app = createTestApp(mw);

    const res = await request(app)
      .get("/protected")
      .set("X-API-Key", "valid-key");
    expect(res.status).toBe(200);
    expect(res.body.principal.id).toBe("user-1");
    expect(res.body.principal.roles).toEqual(["admin"]);
  });

  it("authenticates with valid JWT", async () => {
    const secret = "test-secret-key";
    const mw = new AuthMiddleware({ enabled: true });
    mw.addProvider(new JwtProvider({ secret }));
    const app = createTestApp(mw);

    // Create a valid JWT
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        sub: "jwt-user",
        roles: ["viewer"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    const sig = createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");
    const token = `${header}.${payload}.${sig}`;

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.principal.id).toBe("jwt-user");
  });

  it("rejects expired JWT", async () => {
    const secret = "test-secret-key";
    const mw = new AuthMiddleware({ enabled: true });
    mw.addProvider(new JwtProvider({ secret }));
    const app = createTestApp(mw);

    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ sub: "jwt-user", exp: 1000 }),
    ).toString("base64url");
    const sig = createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");
    const token = `${header}.${payload}.${sig}`;

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
