import { describe, it, expect } from "vitest";
import { PlanningEngine } from "../planning/planning-engine.js";
import { AgentCoreConfigSchema } from "../config.js";
import type { ReasoningResult, MCPTool, Procedure } from "@stem-agent/shared";
import { createMockMemory } from "./helpers.js";

const config = AgentCoreConfigSchema.parse({});

const tools: MCPTool[] = [
  { name: "search", description: "Search the web", parameters: [], serverName: "web" },
  { name: "calculator", description: "Do math", parameters: [], serverName: "math" },
];

function makeReasoning(overrides: Partial<ReasoningResult> = {}): ReasoningResult {
  return {
    conclusion: "Test conclusion",
    confidence: 0.85,
    strategyUsed: "chain_of_thought",
    steps: [],
    evidence: [],
    alternativeConclusions: [],
    trace: [],
    ...overrides,
  };
}

describe("PlanningEngine", () => {
  describe("createPlan", () => {
    it("creates a single response step for chain_of_thought reasoning", async () => {
      const engine = new PlanningEngine(createMockMemory(), config);
      const plan = await engine.createPlan(makeReasoning(), tools);

      expect(plan.goal).toBe("Test conclusion");
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].actionType).toBe("response");
      expect(plan.parallelGroups.length).toBe(1);
    });

    it("converts react steps with actions into tool_call plan steps", async () => {
      const engine = new PlanningEngine(createMockMemory(), config);
      const plan = await engine.createPlan(
        makeReasoning({
          strategyUsed: "react",
          steps: [
            { stepId: 1, thought: "Search for info", action: "search", confidence: 0.8 },
            { stepId: 2, thought: "Calculate", action: "calculator", confidence: 0.9 },
            { stepId: 3, thought: "Done", confidence: 0.85 },
          ],
        }),
        tools,
      );

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[0].actionType).toBe("tool_call");
      expect(plan.steps[0].toolName).toBe("search");
      expect(plan.steps[1].actionType).toBe("tool_call");
      expect(plan.steps[1].toolName).toBe("calculator");
    });

    it("uses procedural memory when a good procedure exists", async () => {
      const memoryWithProcedure = createMockMemory({
        getBestProcedure: async (): Promise<Procedure> => ({
          id: "00000000-0000-0000-0000-000000000001",
          name: "known_procedure",
          description: "A known good procedure",
          steps: ["Step A", "Step B", "Step C"],
          preconditions: [],
          postconditions: [],
          successRate: 0.95,
          executionCount: 10,
          lastUsed: Date.now(),
          tags: [],
        }),
      });
      const engine = new PlanningEngine(memoryWithProcedure, config);
      const plan = await engine.createPlan(makeReasoning(), tools);

      expect(plan.steps.length).toBe(3);
      expect(plan.steps[0].description).toBe("Step A");
    });

    it("skips low-success-rate procedures", async () => {
      const memoryWithBadProcedure = createMockMemory({
        getBestProcedure: async (): Promise<Procedure> => ({
          id: "00000000-0000-0000-0000-000000000002",
          name: "bad_procedure",
          description: "A bad procedure",
          steps: ["Step X"],
          preconditions: [],
          postconditions: [],
          successRate: 0.3,
          executionCount: 2,
          lastUsed: Date.now(),
          tags: [],
        }),
      });
      const engine = new PlanningEngine(memoryWithBadProcedure, config);
      const plan = await engine.createPlan(makeReasoning(), tools);

      // Should not use the procedure, fallback to response step
      expect(plan.steps[0].actionType).toBe("response");
    });

    it("estimates cost based on step types", async () => {
      const engine = new PlanningEngine(createMockMemory(), config);
      const plan = await engine.createPlan(
        makeReasoning({
          strategyUsed: "react",
          steps: [
            { stepId: 1, thought: "Search", action: "search", confidence: 0.8 },
          ],
        }),
        tools,
      );

      expect(plan.estimatedCostUsd).toBeGreaterThan(0);
    });
  });

  describe("parallel group computation", () => {
    it("groups independent steps together", () => {
      const engine = new PlanningEngine(createMockMemory(), config);
      const groups = engine.computeParallelGroups([
        { stepId: 1, actionType: "tool_call", description: "A", dependsOn: [], estimatedConfidence: 0.8 },
        { stepId: 2, actionType: "tool_call", description: "B", dependsOn: [], estimatedConfidence: 0.8 },
        { stepId: 3, actionType: "response", description: "C", dependsOn: [1, 2], estimatedConfidence: 0.8 },
      ]);

      expect(groups.length).toBe(2);
      expect(groups[0]).toContain(1);
      expect(groups[0]).toContain(2);
      expect(groups[1]).toContain(3);
    });

    it("creates sequential groups for chained dependencies", () => {
      const engine = new PlanningEngine(createMockMemory(), config);
      const groups = engine.computeParallelGroups([
        { stepId: 1, actionType: "tool_call", description: "A", dependsOn: [], estimatedConfidence: 0.8 },
        { stepId: 2, actionType: "tool_call", description: "B", dependsOn: [1], estimatedConfidence: 0.8 },
        { stepId: 3, actionType: "response", description: "C", dependsOn: [2], estimatedConfidence: 0.8 },
      ]);

      expect(groups.length).toBe(3);
      expect(groups[0]).toEqual([1]);
      expect(groups[1]).toEqual([2]);
      expect(groups[2]).toEqual([3]);
    });
  });

  describe("replan", () => {
    it("replaces failed step with fallback", async () => {
      const engine = new PlanningEngine(createMockMemory(), config);
      const originalPlan = await engine.createPlan(
        makeReasoning({
          strategyUsed: "react",
          steps: [
            { stepId: 1, thought: "Search", action: "search", confidence: 0.8 },
          ],
        }),
        tools,
      );
      // Manually set fallbackAction on the step
      originalPlan.steps[0].fallbackAction = "Use cached results";

      const newPlan = await engine.replan(originalPlan, 1, "Tool failed");
      expect(newPlan.steps[0].description).toContain("FALLBACK");
      expect(newPlan.estimatedTotalConfidence).toBeLessThan(originalPlan.estimatedTotalConfidence);
    });

    it("removes step without fallback", async () => {
      const engine = new PlanningEngine(createMockMemory(), config);
      const originalPlan = {
        goal: "test",
        steps: [
          { stepId: 1, actionType: "tool_call" as const, description: "A", dependsOn: [], estimatedConfidence: 0.8 },
          { stepId: 2, actionType: "response" as const, description: "B", dependsOn: [1], estimatedConfidence: 0.8 },
        ],
        estimatedTotalConfidence: 0.8,
        parallelGroups: [[1], [2]],
      };

      const newPlan = await engine.replan(originalPlan, 1, "Failed");
      expect(newPlan.steps.length).toBe(1);
      expect(newPlan.steps[0].stepId).toBe(2);
      expect(newPlan.steps[0].dependsOn).toEqual([]);
    });
  });
});
