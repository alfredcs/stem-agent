import { describe, it, expect } from "vitest";
import { AutoGenAdapter } from "../adapters/autogen-adapter.js";
import { CrewAIAdapter } from "../adapters/crewai-adapter.js";
import { LangGraphAdapter } from "../adapters/langgraph-adapter.js";
import { OpenAIAgentsAdapter } from "../adapters/openai-agents-adapter.js";
import { createMockAgent, MOCK_RESPONSE } from "./helpers.js";

describe("AutoGenAdapter", () => {
  it("receives a task and returns task ID", async () => {
    const agent = createMockAgent();
    const adapter = new AutoGenAdapter(agent);

    const taskId = await adapter.receiveTask({
      content: "Hello from AutoGen",
      role: "user",
      name: "test-agent",
    });

    expect(taskId).toBeDefined();
    expect(typeof taskId).toBe("string");
  });

  it("gets task status after receiving", async () => {
    const agent = createMockAgent();
    const adapter = new AutoGenAdapter(agent);

    const taskId = await adapter.receiveTask({ content: "Hi" });
    const status = await adapter.getTaskStatus(taskId);

    expect(status.status).toBe("completed");
    expect(status.content).toBe(MOCK_RESPONSE.content);
  });

  it("cancels a task", async () => {
    const agent = createMockAgent();
    const adapter = new AutoGenAdapter(agent);

    const taskId = await adapter.receiveTask({ content: "Hi" });
    const cancelled = await adapter.cancelTask(taskId);
    expect(cancelled).toBe(true);

    const status = await adapter.getTaskStatus(taskId);
    expect(status.status).toBe("pending");
  });

  it("has correct name and version", () => {
    const agent = createMockAgent();
    const adapter = new AutoGenAdapter(agent);
    expect(adapter.name).toBe("AutoGen");
    expect(adapter.version).toBe("0.7");
  });
});

describe("CrewAIAdapter", () => {
  it("receives a CrewAI task", async () => {
    const agent = createMockAgent();
    const adapter = new CrewAIAdapter(agent);

    const taskId = await adapter.receiveTask({
      description: "Research topic X",
      expected_output: "Summary report",
      agent: "researcher",
    });

    expect(taskId).toBeDefined();

    const status = await adapter.getTaskStatus(taskId);
    expect(status.status).toBe("completed");
  });

  it("has correct name and version", () => {
    const agent = createMockAgent();
    const adapter = new CrewAIAdapter(agent);
    expect(adapter.name).toBe("CrewAI");
    expect(adapter.version).toBe("1.9");
  });
});

describe("LangGraphAdapter", () => {
  it("receives a LangGraph state", async () => {
    const agent = createMockAgent();
    const adapter = new LangGraphAdapter(agent);

    const taskId = await adapter.receiveTask({
      messages: [
        { role: "user", content: "What is 2+2?" },
        { role: "assistant", content: "4" },
        { role: "user", content: "And 3+3?" },
      ],
    });

    expect(taskId).toBeDefined();

    const status = await adapter.getTaskStatus(taskId);
    expect(status.status).toBe("completed");
  });

  it("has correct name and version", () => {
    const agent = createMockAgent();
    const adapter = new LangGraphAdapter(agent);
    expect(adapter.name).toBe("LangGraph");
    expect(adapter.version).toBe("1.0");
  });
});

describe("OpenAIAgentsAdapter", () => {
  it("receives an OpenAI tool call", async () => {
    const agent = createMockAgent();
    const adapter = new OpenAIAgentsAdapter(agent);

    const taskId = await adapter.receiveTask({
      name: "stem_agent",
      arguments: JSON.stringify({ query: "Explain quantum computing" }),
    });

    expect(taskId).toBeDefined();

    const status = await adapter.getTaskStatus(taskId);
    expect(status.status).toBe("completed");
  });

  it("has correct name and version", () => {
    const agent = createMockAgent();
    const adapter = new OpenAIAgentsAdapter(agent);
    expect(adapter.name).toBe("OpenAIAgents");
    expect(adapter.version).toBe("1.0");
  });
});
