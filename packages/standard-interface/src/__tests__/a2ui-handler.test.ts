import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { A2UIHandler } from "../a2ui/a2ui-handler.js";
import { createMockAgent } from "./helpers.js";
import { A2UI_CONTENT_TYPE } from "@stem-agent/shared";
import type { AgentResponse } from "@stem-agent/shared";

function createTestApp(overrides?: Parameters<typeof createMockAgent>[0]) {
  const agent = createMockAgent(overrides);
  const app = express();
  app.use(express.json());

  const handler = new A2UIHandler(agent);
  app.use(handler.createRouter());

  return { app, handler, agent };
}

describe("A2UIHandler", () => {
  describe("POST /a2ui/render", () => {
    it("streams A2UI messages as SSE with beginRendering first", async () => {
      const a2uiChunks: AgentResponse[] = [
        {
          id: "r1",
          status: "in_progress",
          contentType: A2UI_CONTENT_TYPE,
          content: {
            type: "beginRendering",
            surfaceId: "main",
            rootComponentId: "root",
          },
          artifacts: [],
          metadata: {},
        },
        {
          id: "r2",
          status: "in_progress",
          contentType: A2UI_CONTENT_TYPE,
          content: {
            type: "surfaceUpdate",
            surfaceId: "main",
            components: [
              { id: "root", type: "column", properties: {}, childIds: ["text1", "btn1"] },
              { id: "text1", type: "text", properties: { value: "Hello" }, childIds: [] },
              { id: "btn1", type: "button", properties: { label: "Click me" }, childIds: [] },
            ],
          },
          artifacts: [],
          metadata: {},
        },
        {
          id: "r3",
          status: "completed",
          contentType: A2UI_CONTENT_TYPE,
          content: {
            type: "dataModelUpdate",
            surfaceId: "main",
            data: { greeting: "Hello World", count: 42 },
          },
          artifacts: [],
          metadata: {},
        },
      ];

      const { app } = createTestApp({ streamChunks: a2uiChunks });

      const res = await request(app)
        .post("/a2ui/render")
        .send({ message: "Show me a greeting form" })
        .buffer(true)
        .parse((res, callback) => {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => { callback(null, data); });
        });

      expect(res.status).toBe(200);
      const body = res.body as string;

      // Parse SSE data lines (excluding [DONE])
      const lines = body.split("\n").filter((l: string) => l.startsWith("data: ") && l !== "data: [DONE]");
      expect(lines).toHaveLength(3);

      // beginRendering is first message
      const first = JSON.parse(lines[0].slice(6));
      expect(first.type).toBe("beginRendering");
      expect(first.surfaceId).toBe("main");
      expect(first.rootComponentId).toBe("root");

      // surfaceUpdate contains valid flat components
      const second = JSON.parse(lines[1].slice(6));
      expect(second.type).toBe("surfaceUpdate");
      expect(second.components).toHaveLength(3);
      // Components use flat adjacency list (id + childIds, not nesting)
      expect(second.components[0].childIds).toEqual(["text1", "btn1"]);
      expect(second.components[1].type).toBe("text");

      // dataModelUpdate
      const third = JSON.parse(lines[2].slice(6));
      expect(third.type).toBe("dataModelUpdate");
      expect(third.data.greeting).toBe("Hello World");

      // Should end with [DONE]
      expect(body).toContain("data: [DONE]");
    });

    it("handles non-A2UI content in stream", async () => {
      const { app } = createTestApp(); // default mock returns text content

      const res = await request(app)
        .post("/a2ui/render")
        .send({ message: "Hello" })
        .buffer(true)
        .parse((res, callback) => {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => { callback(null, data); });
        });

      expect(res.status).toBe(200);
      const body = res.body as string;
      expect(body).toContain("data: [DONE]");
    });
  });

  describe("POST /a2ui/action", () => {
    it("accepts a valid userAction and returns agent response", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/a2ui/action")
        .send({
          type: "userAction",
          surfaceId: "main",
          componentId: "submit_btn",
          action: "click",
          value: { field1: "value1" },
        });

      expect(res.status).toBe(200);
      expect(res.body.taskId).toBeDefined();
      expect(res.body.status).toBe("completed");
    });

    it("rejects invalid userAction (missing required fields)", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/a2ui/action")
        .send({ invalid: "payload" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid A2UI userAction");
    });

    it("rejects userAction with wrong type literal", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/a2ui/action")
        .send({
          type: "notUserAction",
          surfaceId: "main",
          componentId: "btn",
          action: "click",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid A2UI userAction");
    });

    it("uses provided taskId", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/a2ui/action")
        .send({
          type: "userAction",
          surfaceId: "main",
          componentId: "btn",
          action: "click",
          taskId: "custom-task-123",
        });

      expect(res.status).toBe(200);
      expect(res.body.taskId).toBe("custom-task-123");
    });
  });

  describe("GET /a2ui/surfaces", () => {
    it("returns empty list initially", async () => {
      const { app } = createTestApp();

      const res = await request(app).get("/a2ui/surfaces");

      expect(res.status).toBe(200);
      expect(res.body.surfaces).toEqual([]);
    });
  });

  describe("DELETE /a2ui/surfaces/:surfaceId", () => {
    it("returns 404 for nonexistent surface", async () => {
      const { app } = createTestApp();

      const res = await request(app).delete("/a2ui/surfaces/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  describe("Surface state tracking", () => {
    it("tracks surfaces from streamed surfaceUpdate messages", async () => {
      const a2uiChunks: AgentResponse[] = [
        {
          id: "r1",
          status: "in_progress",
          contentType: A2UI_CONTENT_TYPE,
          content: {
            type: "surfaceUpdate",
            surfaceId: "tracked-surface",
            components: [
              { id: "root", type: "column", properties: {}, childIds: ["c1"] },
              { id: "c1", type: "text", properties: { value: "Hi" }, childIds: [] },
            ],
          },
          artifacts: [],
          metadata: {},
        },
        {
          id: "r2",
          status: "completed",
          contentType: A2UI_CONTENT_TYPE,
          content: {
            type: "beginRendering",
            surfaceId: "tracked-surface",
            rootComponentId: "root",
          },
          artifacts: [],
          metadata: {},
        },
      ];

      const { app, handler } = createTestApp({ streamChunks: a2uiChunks });

      // Trigger render to populate surface state
      await request(app)
        .post("/a2ui/render")
        .send({ message: "render" })
        .buffer(true)
        .parse((res, callback) => {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => { callback(null, data); });
        });

      // Verify surface was tracked
      expect(handler.getSurfaceIds()).toContain("tracked-surface");
      const surface = handler.getSurface("tracked-surface");
      expect(surface?.components.size).toBe(2);
      expect(surface?.rootComponentId).toBe("root");

      // List surfaces via API
      const listRes = await request(app).get("/a2ui/surfaces");
      expect(listRes.body.surfaces).toHaveLength(1);
      expect(listRes.body.surfaces[0].surfaceId).toBe("tracked-surface");
      expect(listRes.body.surfaces[0].componentCount).toBe(2);
    });
  });

  describe("A2UIHandler.validate", () => {
    it("validates surfaceUpdate messages", () => {
      const msg = A2UIHandler.validate({
        type: "surfaceUpdate",
        surfaceId: "s1",
        components: [{ id: "c1", type: "text", properties: { value: "Hi" }, childIds: [] }],
      });
      expect(msg.type).toBe("surfaceUpdate");
    });

    it("validates beginRendering messages", () => {
      const msg = A2UIHandler.validate({
        type: "beginRendering",
        surfaceId: "s1",
        rootComponentId: "root",
      });
      expect(msg.type).toBe("beginRendering");
    });

    it("validates dataModelUpdate messages", () => {
      const msg = A2UIHandler.validate({
        type: "dataModelUpdate",
        surfaceId: "s1",
        data: { key: "value" },
      });
      expect(msg.type).toBe("dataModelUpdate");
    });

    it("validates deleteSurface messages", () => {
      const msg = A2UIHandler.validate({
        type: "deleteSurface",
        surfaceId: "s1",
      });
      expect(msg.type).toBe("deleteSurface");
    });

    it("rejects invalid messages", () => {
      expect(() => A2UIHandler.validate({ type: "invalid" })).toThrow();
    });
  });
});
