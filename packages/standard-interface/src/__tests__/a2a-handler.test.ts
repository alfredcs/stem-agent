import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { A2AHandler } from "../a2a/a2a-handler.js";
import { agentCardRouter } from "../a2a/agent-card-handler.js";
import { createMockAgent, MOCK_AGENT_CARD } from "./helpers.js";

function createTestApp() {
  const agent = createMockAgent();
  const app = express();
  app.use(express.json());

  // Mount agent card
  app.use(agentCardRouter(agent));

  // Mount A2A
  const handler = new A2AHandler(agent);
  app.use(handler.createRouter());

  return app;
}

describe("Agent Card", () => {
  it("serves agent card at /.well-known/agent.json", async () => {
    const app = createTestApp();
    const res = await request(app).get("/.well-known/agent.json");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(MOCK_AGENT_CARD.name);
    expect(res.body.protocolVersion).toBe("0.3.0");
    expect(res.body.capabilities.streaming).toBe(true);
  });
});

describe("A2A Handler", () => {
  it("rejects invalid JSON-RPC request", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/a2a")
      .send({ not: "jsonrpc" });

    expect(res.status).toBe(200);
    expect(res.body.error.code).toBe(-32600);
  });

  it("rejects unknown method", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/a2a")
      .send({ jsonrpc: "2.0", id: 1, method: "unknown/method" });

    expect(res.status).toBe(200);
    expect(res.body.error.code).toBe(-32601);
  });

  it("handles tasks/send", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/a2a")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/send",
        params: { message: "Hello" },
      });

    expect(res.status).toBe(200);
    expect(res.body.jsonrpc).toBe("2.0");
    expect(res.body.id).toBe(1);
    expect(res.body.result.status).toBe("completed");
    expect(res.body.result.content).toBe("Hello from the agent");
    expect(res.body.result.taskId).toBeDefined();
  });

  it("handles tasks/get after tasks/send", async () => {
    const app = createTestApp();

    // First send a task
    const sendRes = await request(app)
      .post("/a2a")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/send",
        params: { message: "Hello" },
      });
    const taskId = sendRes.body.result.taskId;

    // Then get it
    const getRes = await request(app)
      .post("/a2a")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tasks/get",
        params: { taskId },
      });

    expect(getRes.body.result.taskId).toBe(taskId);
    expect(getRes.body.result.status).toBe("completed");
  });

  it("handles tasks/cancel", async () => {
    const app = createTestApp();

    // Send a task
    const sendRes = await request(app)
      .post("/a2a")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/send",
        params: { message: "Hello" },
      });
    const taskId = sendRes.body.result.taskId;

    // Cancel it
    const cancelRes = await request(app)
      .post("/a2a")
      .send({
        jsonrpc: "2.0",
        id: 3,
        method: "tasks/cancel",
        params: { taskId },
      });

    expect(cancelRes.body.result.status).toBe("cancelled");
  });

  it("returns error for tasks/get with unknown taskId", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/a2a")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tasks/get",
        params: { taskId: "nonexistent" },
      });

    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe(-32603);
  });
});
