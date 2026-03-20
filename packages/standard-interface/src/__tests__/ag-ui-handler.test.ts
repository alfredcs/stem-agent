import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { AGUIHandler } from "../ag-ui/ag-ui-handler.js";
import { createMockAgent } from "./helpers.js";
import { AGUIEventType } from "@stem-agent/shared";
import type { AgentResponse } from "@stem-agent/shared";

function createTestApp(overrides?: Parameters<typeof createMockAgent>[0]) {
  const agent = createMockAgent(overrides);
  const app = express();
  app.use(express.json());
  const handler = new AGUIHandler(agent);
  app.use(handler.createRouter());
  return app;
}

/** Parse SSE blocks with named event fields: "event: TYPE\ndata: JSON" */
function parseSSEEvents(text: string): Array<{ eventName: string; data: any }> {
  return text
    .split("\n\n")
    .filter((block) => block.includes("data: "))
    .map((block) => {
      const lines = block.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event: "));
      const dataLine = lines.find((l) => l.startsWith("data: "));
      return {
        eventName: eventLine ? eventLine.replace("event: ", "") : "",
        data: dataLine ? JSON.parse(dataLine.replace("data: ", "")) : null,
      };
    });
}

const VALID_INPUT = {
  threadId: "thread-1",
  runId: "run-1",
  messages: [{ id: "msg-1", role: "user", content: "Hello" }],
};

describe("AGUIHandler", () => {
  it("rejects invalid input with 400", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ag-ui")
      .send({ invalid: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid AG-UI input");
  });

  it("streams SSE with correct content-type", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
  });

  it("uses named SSE event fields matching the event type", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    // Every event's SSE event name should match its data.type
    for (const ev of events) {
      expect(ev.eventName).toBe(ev.data.type);
    }
  });

  it("emits RUN_STARTED and RUN_FINISHED lifecycle events", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    const types = events.map((e) => e.data.type);

    expect(types[0]).toBe(AGUIEventType.RUN_STARTED);
    expect(types[types.length - 1]).toBe(AGUIEventType.RUN_FINISHED);

    const runStarted = events[0].data;
    expect(runStarted.threadId).toBe("thread-1");
    expect(runStarted.runId).toBe("run-1");
  });

  it("emits STEP_STARTED and STEP_FINISHED around phase events", async () => {
    const chunks: AgentResponse[] = [
      {
        id: "r1",
        status: "in_progress",
        content: "Perceived intent",
        contentType: "text/plain",
        artifacts: [],
        metadata: { phase: "perception" },
      },
      {
        id: "r2",
        status: "completed",
        content: "Final result",
        contentType: "text/plain",
        artifacts: [],
        metadata: { phase: "execution" },
      },
    ];

    const app = createTestApp({ streamChunks: chunks });
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    const types = events.map((e) => e.data.type);

    expect(types).toContain(AGUIEventType.STEP_STARTED);
    expect(types).toContain(AGUIEventType.STEP_FINISHED);

    const stepStarted = events.find((e) => e.data.type === AGUIEventType.STEP_STARTED);
    expect(stepStarted!.data.stepName).toBe("perception");
  });

  it("emits REASONING_* events for reasoning phase", async () => {
    const chunks: AgentResponse[] = [
      {
        id: "r1",
        status: "in_progress",
        content: "Strategy: chain_of_thought",
        contentType: "text/plain",
        artifacts: [],
        metadata: { phase: "reasoning" },
        reasoningTrace: ["Step 1: analyze", "Step 2: conclude"],
      },
    ];

    const app = createTestApp({ streamChunks: chunks });
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    const types = events.map((e) => e.data.type);

    expect(types).toContain(AGUIEventType.REASONING_START);
    expect(types).toContain(AGUIEventType.REASONING_MESSAGE_START);
    expect(types).toContain(AGUIEventType.REASONING_MESSAGE_CONTENT);
    expect(types).toContain(AGUIEventType.REASONING_MESSAGE_END);
    expect(types).toContain(AGUIEventType.REASONING_END);

    // 3 REASONING_MESSAGE_CONTENT events: 1 for content + 2 for trace
    const contentEvents = events.filter(
      (e) => e.data.type === AGUIEventType.REASONING_MESSAGE_CONTENT,
    );
    expect(contentEvents.length).toBe(3);
  });

  it("emits STATE_SNAPSHOT for planning phase", async () => {
    const chunks: AgentResponse[] = [
      {
        id: "r1",
        status: "in_progress",
        content: "3 steps in 2 groups",
        contentType: "text/plain",
        artifacts: [],
        metadata: { phase: "planning" },
      },
    ];

    const app = createTestApp({ streamChunks: chunks });
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    const snapshot = events.find((e) => e.data.type === AGUIEventType.STATE_SNAPSHOT);

    expect(snapshot).toBeDefined();
    expect(snapshot!.data.snapshot.phase).toBe("planning");
  });

  it("emits TOOL_CALL_* events for execution phase with steps", async () => {
    const chunks: AgentResponse[] = [
      {
        id: "r1",
        status: "completed",
        content: "Executed successfully",
        contentType: "text/plain",
        artifacts: [],
        metadata: { phase: "execution", stepsExecuted: 3, strategy: "react" },
      },
    ];

    const app = createTestApp({ streamChunks: chunks });
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    const types = events.map((e) => e.data.type);

    expect(types).toContain(AGUIEventType.TOOL_CALL_START);
    expect(types).toContain(AGUIEventType.TOOL_CALL_ARGS);
    expect(types).toContain(AGUIEventType.TOOL_CALL_END);
    expect(types).toContain(AGUIEventType.TOOL_CALL_RESULT);

    const toolStart = events.find((e) => e.data.type === AGUIEventType.TOOL_CALL_START);
    expect(toolStart!.data.toolCallName).toBe("react");
  });

  it("emits final TEXT_MESSAGE_* events with response content", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    const types = events.map((e) => e.data.type);

    expect(types).toContain(AGUIEventType.TEXT_MESSAGE_START);
    expect(types).toContain(AGUIEventType.TEXT_MESSAGE_CONTENT);
    expect(types).toContain(AGUIEventType.TEXT_MESSAGE_END);

    const textContent = events.find(
      (e) => e.data.type === AGUIEventType.TEXT_MESSAGE_CONTENT,
    );
    expect(textContent!.data.delta).toBe("Hello from the agent");
  });

  it("emits RUN_ERROR on pipeline failure", async () => {
    const agent = createMockAgent();
    agent.stream = async function* () {
      throw new Error("Pipeline exploded");
    };

    const app = express();
    app.use(express.json());
    const handler = new AGUIHandler(agent);
    app.use(handler.createRouter());

    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    const errorEvent = events.find((e) => e.data.type === AGUIEventType.RUN_ERROR);

    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data.message).toBe("Pipeline exploded");
  });

  it("accepts simple input with { message, threadId?, runId? }", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ag-ui")
      .send({ message: "Hello agent" });

    expect(res.status).toBe(200);
    const events = parseSSEEvents(res.text);
    const types = events.map((e) => e.data.type);

    expect(types[0]).toBe(AGUIEventType.RUN_STARTED);
    expect(types[types.length - 1]).toBe(AGUIEventType.RUN_FINISHED);
    // threadId and runId should be auto-generated
    expect(events[0].data.threadId).toBeDefined();
    expect(events[0].data.runId).toBeDefined();
  });

  it("accepts full RunAgentInput with defaults", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ag-ui")
      .send({ threadId: "t1", runId: "r1" });

    expect(res.status).toBe(200);
    const events = parseSSEEvents(res.text);
    expect(events.length).toBeGreaterThan(0);
  });

  it("emits CUSTOM event for unknown phases", async () => {
    const chunks: AgentResponse[] = [
      {
        id: "r1",
        status: "in_progress",
        content: "Adapting",
        contentType: "text/plain",
        artifacts: [],
        metadata: { phase: "adaptation" },
      },
    ];

    const app = createTestApp({ streamChunks: chunks });
    const res = await request(app)
      .post("/ag-ui")
      .send(VALID_INPUT);

    const events = parseSSEEvents(res.text);
    const custom = events.find((e) => e.data.type === AGUIEventType.CUSTOM);

    expect(custom).toBeDefined();
    expect(custom!.data.name).toBe("phase.adaptation");
  });
});
