import { describe, it, expect } from "vitest";
import { StrategySelector } from "../reasoning/strategy-selector.js";
import type { PerceptionResult } from "@stem-agent/shared";

function makePerception(overrides: Partial<PerceptionResult> = {}): PerceptionResult {
  return {
    intent: "question",
    complexity: "simple",
    urgency: "medium",
    entities: [],
    callerStyleSignals: {},
    context: {},
    metadata: {},
    ...overrides,
  };
}

describe("StrategySelector", () => {
  const selector = new StrategySelector();

  it("selects react when tools are required", () => {
    const p = makePerception({ intent: "question", complexity: "simple" });
    expect(selector.select(p, true)).toBe("react");
  });

  it("selects reflexion for complex tasks", () => {
    const p = makePerception({ complexity: "complex" });
    expect(selector.select(p, false)).toBe("reflexion");
  });

  it("selects internal_debate for medium analysis requests", () => {
    const p = makePerception({ intent: "analysis_request", complexity: "medium" });
    expect(selector.select(p, false)).toBe("internal_debate");
  });

  it("selects internal_debate for creative requests", () => {
    const p = makePerception({ intent: "creative_request", complexity: "simple" });
    expect(selector.select(p, false)).toBe("internal_debate");
  });

  it("defaults to chain_of_thought", () => {
    const p = makePerception({ intent: "question", complexity: "simple" });
    expect(selector.select(p, false)).toBe("chain_of_thought");
  });

  it("prefers react over complexity when tools required", () => {
    const p = makePerception({ complexity: "complex" });
    expect(selector.select(p, true)).toBe("react");
  });

  it("selects chain_of_thought for simple analysis", () => {
    const p = makePerception({ intent: "analysis_request", complexity: "simple" });
    expect(selector.select(p, false)).toBe("chain_of_thought");
  });
});
