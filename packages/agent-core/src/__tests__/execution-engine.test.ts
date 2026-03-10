import { describe, it, expect, vi } from "vitest";
import { ExecutionEngine } from "../execution/execution-engine.js";
import { AgentCoreConfigSchema } from "../config.js";
import type { ExecutionPlan } from "@stem-agent/shared";
import { createMockMCP, createMockMemory } from "./helpers.js";

const config = AgentCoreConfigSchema.parse({});

function makePlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    goal: "Test goal",
    steps: [
      { stepId: 1, actionType: "response", description: "Respond", dependsOn: [], estimatedConfidence: 0.9 },
    ],
    estimatedTotalConfidence: 0.9,
    parallelGroups: [[1]],
    ...overrides,
  };
}

describe("ExecutionEngine", () => {
  describe("successful execution", () => {
    it("executes a single response step", async () => {
      const engine = new ExecutionEngine(createMockMCP(), createMockMemory(), config);
      const result = await engine.execute(makePlan());

      expect(result.success).toBe(true);
      expect(result.stepResults.length).toBe(1);
      expect(result.stepResults[0].success).toBe(true);
    });

    it("executes tool_call steps via MCP", async () => {
      const callTool = vi.fn().mockResolvedValue({
        toolName: "search",
        success: true,
        data: { answer: "42" },
      });
      const mcp = createMockMCP({ callTool });
      const engine = new ExecutionEngine(mcp, createMockMemory(), config);

      const result = await engine.execute(
        makePlan({
          steps: [
            { stepId: 1, actionType: "tool_call", description: "Search", toolName: "search", toolArguments: { q: "test" }, dependsOn: [], estimatedConfidence: 0.9 },
          ],
          parallelGroups: [[1]],
        }),
      );

      expect(result.success).toBe(true);
      expect(callTool).toHaveBeenCalledWith("search", { q: "test" });
    });

    it("executes memory_lookup steps", async () => {
      const recall = vi.fn().mockResolvedValue([]);
      const memory = createMockMemory({ recall });
      const engine = new ExecutionEngine(createMockMCP(), memory, config);

      const result = await engine.execute(
        makePlan({
          steps: [
            { stepId: 1, actionType: "memory_lookup", description: "Recall info", dependsOn: [], estimatedConfidence: 0.9 },
          ],
          parallelGroups: [[1]],
        }),
      );

      expect(result.success).toBe(true);
      expect(recall).toHaveBeenCalled();
    });
  });

  describe("parallel execution", () => {
    it("executes independent steps in parallel", async () => {
      const engine = new ExecutionEngine(createMockMCP(), createMockMemory(), config);
      const result = await engine.execute(
        makePlan({
          steps: [
            { stepId: 1, actionType: "response", description: "A", dependsOn: [], estimatedConfidence: 0.9 },
            { stepId: 2, actionType: "response", description: "B", dependsOn: [], estimatedConfidence: 0.9 },
            { stepId: 3, actionType: "response", description: "C", dependsOn: [1, 2], estimatedConfidence: 0.9 },
          ],
          parallelGroups: [[1, 2], [3]],
        }),
      );

      expect(result.success).toBe(true);
      expect(result.stepResults.length).toBe(3);
    });
  });

  describe("retry logic", () => {
    it("retries failed steps up to maxExecutionRetries", async () => {
      let callCount = 0;
      const callTool = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          return { toolName: "search", success: false, data: null, error: "Transient error" };
        }
        return { toolName: "search", success: true, data: "ok" };
      });
      const mcp = createMockMCP({ callTool });
      const engine = new ExecutionEngine(mcp, createMockMemory(), config);

      const result = await engine.execute(
        makePlan({
          steps: [
            { stepId: 1, actionType: "tool_call", description: "Search", toolName: "search", dependsOn: [], estimatedConfidence: 0.9 },
          ],
          parallelGroups: [[1]],
        }),
      );

      expect(result.success).toBe(true);
      // Initial attempt + 2 retries = 3 calls
      expect(callTool).toHaveBeenCalledTimes(3);
    });

    it("fails after exhausting retries", async () => {
      const callTool = vi.fn().mockResolvedValue({
        toolName: "search",
        success: false,
        data: null,
        error: "Permanent error",
      });
      const mcp = createMockMCP({ callTool });
      const engine = new ExecutionEngine(mcp, createMockMemory(), config);

      const result = await engine.execute(
        makePlan({
          steps: [
            { stepId: 1, actionType: "tool_call", description: "Search", toolName: "search", dependsOn: [], estimatedConfidence: 0.9 },
          ],
          parallelGroups: [[1]],
        }),
      );

      expect(result.success).toBe(false);
      expect(result.stepResults[0].error).toBe("Permanent error");
    });
  });

  describe("fallback actions", () => {
    it("uses fallback when step fails and fallback is defined", async () => {
      const callTool = vi.fn().mockResolvedValue({
        toolName: "search",
        success: false,
        data: null,
        error: "Failed",
      });
      const mcp = createMockMCP({ callTool });
      const engine = new ExecutionEngine(mcp, createMockMemory(), config);

      const result = await engine.execute(
        makePlan({
          steps: [
            {
              stepId: 1,
              actionType: "tool_call",
              description: "Search",
              toolName: "search",
              dependsOn: [],
              estimatedConfidence: 0.9,
              fallbackAction: "Use cached results",
            },
          ],
          parallelGroups: [[1]],
        }),
      );

      expect(result.success).toBe(true);
      expect(result.stepResults[0].data).toContain("FALLBACK");
    });
  });

  describe("circuit breaker", () => {
    it("trips after consecutive failures and aborts remaining steps", async () => {
      const callTool = vi.fn().mockResolvedValue({
        toolName: "search",
        success: false,
        data: null,
        error: "Failed",
      });
      const mcp = createMockMCP({ callTool });
      const circuitConfig = AgentCoreConfigSchema.parse({
        circuitBreakerThreshold: 2,
        maxExecutionRetries: 0,
      });
      const engine = new ExecutionEngine(mcp, createMockMemory(), circuitConfig);

      const result = await engine.execute(
        makePlan({
          steps: [
            { stepId: 1, actionType: "tool_call", description: "A", toolName: "search", dependsOn: [], estimatedConfidence: 0.9 },
            { stepId: 2, actionType: "tool_call", description: "B", toolName: "search", dependsOn: [], estimatedConfidence: 0.9 },
            { stepId: 3, actionType: "tool_call", description: "C", toolName: "search", dependsOn: [], estimatedConfidence: 0.9 },
          ],
          parallelGroups: [[1], [2], [3]],
        }),
      );

      expect(result.success).toBe(false);
      // Step 3 should be aborted by circuit breaker
      const step3 = result.stepResults.find((r) => r.stepId === 3);
      expect(step3?.error).toContain("Circuit breaker");
    });
  });

  describe("dependency validation", () => {
    it("fails step when dependency is not satisfied", async () => {
      const callTool = vi.fn().mockResolvedValue({
        toolName: "search",
        success: false,
        data: null,
        error: "Failed",
      });
      const mcp = createMockMCP({ callTool });
      const noRetryConfig = AgentCoreConfigSchema.parse({ maxExecutionRetries: 0 });
      const engine = new ExecutionEngine(mcp, createMockMemory(), noRetryConfig);

      const result = await engine.execute(
        makePlan({
          steps: [
            { stepId: 1, actionType: "tool_call", description: "A", toolName: "search", dependsOn: [], estimatedConfidence: 0.9 },
            { stepId: 2, actionType: "response", description: "B", dependsOn: [1], estimatedConfidence: 0.9 },
          ],
          parallelGroups: [[1], [2]],
        }),
      );

      expect(result.success).toBe(false);
      const step2 = result.stepResults.find((r) => r.stepId === 2);
      expect(step2?.error).toContain("Dependency");
    });
  });

  describe("learning on success", () => {
    it("calls memory.learn() on successful plan execution", async () => {
      const learn = vi.fn().mockResolvedValue(undefined);
      const memory = createMockMemory({ learn });
      const engine = new ExecutionEngine(createMockMCP(), memory, config);

      await engine.execute(makePlan());

      // learn is called asynchronously, give it a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(learn).toHaveBeenCalled();
    });
  });
});
