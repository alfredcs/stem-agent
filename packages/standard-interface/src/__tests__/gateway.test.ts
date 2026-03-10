import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { Gateway } from "../gateway.js";
import { createMockAgent } from "./helpers.js";

describe("Gateway", () => {
  let gateway: Gateway;

  afterEach(async () => {
    await gateway?.stop().catch(() => {});
  });

  it("serves health endpoint", async () => {
    const agent = createMockAgent();
    gateway = new Gateway(agent, { logLevel: "silent" });

    const res = await request(gateway.getApp()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("serves agent card via A2A endpoint", async () => {
    const agent = createMockAgent();
    gateway = new Gateway(agent, { logLevel: "silent" });

    const res = await request(gateway.getApp()).get(
      "/.well-known/agent.json",
    );
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test Agent");
  });

  it("handles A2A JSON-RPC requests", async () => {
    const agent = createMockAgent();
    gateway = new Gateway(agent, { logLevel: "silent" });

    const res = await request(gateway.getApp())
      .post("/a2a")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/send",
        params: { message: "Test" },
      });

    expect(res.status).toBe(200);
    expect(res.body.result.content).toBe("Hello from the agent");
  });

  it("handles REST task creation", async () => {
    const agent = createMockAgent();
    gateway = new Gateway(agent, { logLevel: "silent" });

    const res = await request(gateway.getApp())
      .post("/api/v1/tasks")
      .send({ message: "Test task" });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Hello from the agent");
  });

  it("serves OpenAPI spec", async () => {
    const agent = createMockAgent();
    gateway = new Gateway(agent, { logLevel: "silent" });

    const res = await request(gateway.getApp()).get("/api-docs");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
  });

  it("enforces auth when configured", async () => {
    const agent = createMockAgent();
    gateway = new Gateway(agent, {
      logLevel: "silent",
      auth: {
        enabled: true,
        apiKey: {
          keys: { "test-key": { id: "user-1" } },
        },
      },
    });

    // Without auth
    const noAuth = await request(gateway.getApp()).get("/api/v1/agent-card");
    expect(noAuth.status).toBe(401);

    // With auth
    const withAuth = await request(gateway.getApp())
      .get("/api/v1/agent-card")
      .set("X-API-Key", "test-key");
    expect(withAuth.status).toBe(200);

    // Public paths are allowed without auth
    const health = await request(gateway.getApp()).get("/api/v1/health");
    expect(health.status).toBe(200);
  });

  it("enforces rate limiting when configured", async () => {
    const agent = createMockAgent();
    gateway = new Gateway(agent, {
      logLevel: "silent",
      rateLimit: { requestsPerMinute: 60, burst: 1 },
    });

    const first = await request(gateway.getApp()).get("/api/v1/health");
    expect(first.status).toBe(200);

    const second = await request(gateway.getApp()).get("/api/v1/health");
    expect(second.status).toBe(429);
  });

  it("starts and stops", async () => {
    const agent = createMockAgent();
    gateway = new Gateway(agent, { port: 0, logLevel: "silent" });

    await gateway.start();
    const addr = gateway.getHttpServer().address();
    expect(addr).not.toBeNull();

    await gateway.stop();
  });
});
