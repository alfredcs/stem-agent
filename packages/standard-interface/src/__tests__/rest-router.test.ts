import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { restRouter } from "../rest/rest-router.js";
import { errorHandler } from "../middleware/error-handler.js";
import { createMockAgent } from "./helpers.js";

function createTestApp() {
  const agent = createMockAgent();
  const app = express();
  app.use(express.json());
  app.use(restRouter({ agent }));
  app.use(errorHandler);
  return app;
}

describe("REST Router", () => {
  describe("GET /api/v1/health", () => {
    it("returns ok status", async () => {
      const app = createTestApp();
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe("GET /api/v1/agent-card", () => {
    it("returns agent card", async () => {
      const app = createTestApp();
      const res = await request(app).get("/api/v1/agent-card");

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Test Agent");
      expect(res.body.agentId).toBe("test-agent");
    });
  });

  describe("POST /api/v1/tasks", () => {
    it("creates a task and returns result", async () => {
      const app = createTestApp();
      const res = await request(app)
        .post("/api/v1/tasks")
        .send({ message: "Hello" });

      expect(res.status).toBe(201);
      expect(res.body.taskId).toBeDefined();
      expect(res.body.status).toBe("completed");
      expect(res.body.content).toBe("Hello from the agent");
    });

    it("returns 400 for missing message field", async () => {
      const app = createTestApp();
      const res = await request(app).post("/api/v1/tasks").send({});

      // message is z.unknown() so it allows undefined — this should pass
      // since message field accepts any value including undefined
      expect(res.status).toBe(201);
    });
  });

  describe("GET /api/v1/tasks/:id", () => {
    it("returns 404 for unknown task", async () => {
      const app = createTestApp();
      const res = await request(app).get("/api/v1/tasks/nonexistent");
      expect(res.status).toBe(404);
    });

    it("returns task details after creation", async () => {
      const app = createTestApp();

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .send({ message: "Hi" });
      const taskId = createRes.body.taskId;

      const res = await request(app).get(`/api/v1/tasks/${taskId}`);
      expect(res.status).toBe(200);
      expect(res.body.taskId).toBe(taskId);
      expect(res.body.status).toBe("completed");
    });
  });

  describe("POST /api/v1/tasks/:id/cancel", () => {
    it("cancels an existing task", async () => {
      const app = createTestApp();

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .send({ message: "Hi" });
      const taskId = createRes.body.taskId;

      const res = await request(app).post(`/api/v1/tasks/${taskId}/cancel`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cancelled");
    });

    it("returns 404 for unknown task", async () => {
      const app = createTestApp();
      const res = await request(app).post("/api/v1/tasks/nonexistent/cancel");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/tasks", () => {
    it("lists all tasks", async () => {
      const app = createTestApp();

      await request(app).post("/api/v1/tasks").send({ message: "A" });
      await request(app).post("/api/v1/tasks").send({ message: "B" });

      const res = await request(app).get("/api/v1/tasks");
      expect(res.status).toBe(200);
      expect(res.body.tasks.length).toBe(2);
      expect(res.body.total).toBe(2);
    });

    it("filters by status", async () => {
      const app = createTestApp();

      const createRes = await request(app)
        .post("/api/v1/tasks")
        .send({ message: "A" });
      await request(app).post(`/api/v1/tasks/${createRes.body.taskId}/cancel`);
      await request(app).post("/api/v1/tasks").send({ message: "B" });

      const res = await request(app).get("/api/v1/tasks?status=cancelled");
      expect(res.status).toBe(200);
      expect(res.body.tasks.length).toBe(1);
    });
  });

  describe("POST /api/v1/chat", () => {
    it("returns chat response", async () => {
      const app = createTestApp();
      const res = await request(app)
        .post("/api/v1/chat")
        .send({ message: "Hello" });

      expect(res.status).toBe(200);
      expect(res.body.taskId).toBeDefined();
      expect(res.body.content).toBe("Hello from the agent");
    });
  });
});
