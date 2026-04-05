import { describe, it, expect } from "vitest";
import { DomainPersonaSchema, ReasoningStrategy } from "@stem-agent/shared";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../../..");

// ---------------------------------------------------------------------------
// Schema Validation — Required Fields
// ---------------------------------------------------------------------------

describe("DomainPersonaSchema — Required Fields", () => {
  it("parses a minimal persona (name + systemPrompt only)", () => {
    const result = DomainPersonaSchema.parse({
      name: "TestAgent",
      systemPrompt: "You are a test agent.",
    });
    expect(result.name).toBe("TestAgent");
    expect(result.systemPrompt).toBe("You are a test agent.");
    expect(result.allowedIntents).toEqual([]);
    expect(result.forbiddenTopics).toEqual([]);
    expect(result.preferredStrategy).toBeUndefined();
    expect(result.defaultBehavior).toEqual({});
    expect(result.requiredMCPServers).toEqual([]);
    expect(result.toolAllowlist).toEqual([]);
    expect(result.domainTags).toEqual([]);
  });

  it("rejects missing name", () => {
    expect(() => DomainPersonaSchema.parse({
      systemPrompt: "test",
    })).toThrow();
  });

  it("rejects missing systemPrompt", () => {
    expect(() => DomainPersonaSchema.parse({
      name: "Bad",
    })).toThrow();
  });

  it("rejects empty object", () => {
    expect(() => DomainPersonaSchema.parse({})).toThrow();
  });

  it("rejects null", () => {
    expect(() => DomainPersonaSchema.parse(null)).toThrow();
  });

  it("rejects string input", () => {
    expect(() => DomainPersonaSchema.parse("not an object")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Schema Validation — Strategy Enum
// ---------------------------------------------------------------------------

describe("DomainPersonaSchema — preferredStrategy", () => {
  const VALID_STRATEGIES = [
    "chain_of_thought",
    "react",
    "reflexion",
    "tree_of_thought",
    "internal_debate",
    "analogical",
  ];

  for (const strategy of VALID_STRATEGIES) {
    it(`accepts strategy: ${strategy}`, () => {
      const result = DomainPersonaSchema.parse({
        name: "Test",
        systemPrompt: "test",
        preferredStrategy: strategy,
      });
      expect(result.preferredStrategy).toBe(strategy);
    });
  }

  it("rejects invalid strategy string", () => {
    expect(() => DomainPersonaSchema.parse({
      name: "Bad",
      systemPrompt: "test",
      preferredStrategy: "not_a_strategy",
    })).toThrow();
  });

  it("rejects numeric strategy", () => {
    expect(() => DomainPersonaSchema.parse({
      name: "Bad",
      systemPrompt: "test",
      preferredStrategy: 42,
    })).toThrow();
  });

  it("allows omitted strategy (undefined)", () => {
    const result = DomainPersonaSchema.parse({
      name: "Test",
      systemPrompt: "test",
    });
    expect(result.preferredStrategy).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Schema Validation — defaultBehavior Partial
// ---------------------------------------------------------------------------

describe("DomainPersonaSchema — defaultBehavior", () => {
  it("accepts empty behavior object", () => {
    const result = DomainPersonaSchema.parse({
      name: "Test",
      systemPrompt: "test",
      defaultBehavior: {},
    });
    expect(result.defaultBehavior).toEqual({});
  });

  it("accepts single field override", () => {
    const result = DomainPersonaSchema.parse({
      name: "Test",
      systemPrompt: "test",
      defaultBehavior: { reasoningDepth: 3 },
    });
    expect(result.defaultBehavior.reasoningDepth).toBe(3);
    expect(result.defaultBehavior.creativityLevel).toBeUndefined();
  });

  it("accepts all behavior fields simultaneously", () => {
    const result = DomainPersonaSchema.parse({
      name: "Test",
      systemPrompt: "test",
      defaultBehavior: {
        reasoningDepth: 6,
        explorationVsExploitation: 0.8,
        verbosityLevel: 0.3,
        confidenceThreshold: 0.9,
        toolUsePreference: 0.1,
        creativityLevel: 0.95,
        proactiveSuggestion: false,
        maxPlanSteps: 15,
      },
    });
    expect(result.defaultBehavior.reasoningDepth).toBe(6);
    expect(result.defaultBehavior.proactiveSuggestion).toBe(false);
    expect(result.defaultBehavior.maxPlanSteps).toBe(15);
  });

  it("defaults to empty when omitted", () => {
    const result = DomainPersonaSchema.parse({
      name: "Test",
      systemPrompt: "test",
    });
    expect(result.defaultBehavior).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Schema Validation — Arrays (allowedIntents, forbiddenTopics, etc.)
// ---------------------------------------------------------------------------

describe("DomainPersonaSchema — Array Fields", () => {
  it("accepts empty arrays for all list fields", () => {
    const result = DomainPersonaSchema.parse({
      name: "Test",
      systemPrompt: "test",
      allowedIntents: [],
      forbiddenTopics: [],
      requiredMCPServers: [],
      toolAllowlist: [],
      domainTags: [],
    });
    expect(result.allowedIntents).toEqual([]);
    expect(result.forbiddenTopics).toEqual([]);
  });

  it("accepts populated arrays", () => {
    const result = DomainPersonaSchema.parse({
      name: "Test",
      systemPrompt: "test",
      allowedIntents: ["question", "command", "debugging"],
      forbiddenTopics: ["topic-a", "topic-b"],
      requiredMCPServers: ["server-1", "server-2", "server-3"],
      toolAllowlist: ["tool_a", "tool_b"],
      domainTags: ["tag1", "tag2", "tag3"],
    });
    expect(result.allowedIntents).toHaveLength(3);
    expect(result.forbiddenTopics).toHaveLength(2);
    expect(result.requiredMCPServers).toHaveLength(3);
    expect(result.toolAllowlist).toHaveLength(2);
    expect(result.domainTags).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Full Persona — Complete Object
// ---------------------------------------------------------------------------

describe("DomainPersonaSchema — Full Persona", () => {
  it("parses a complete finance persona", () => {
    const result = DomainPersonaSchema.parse({
      name: "FinanceAgent",
      systemPrompt: "You are a financial agent. Never give investment advice.",
      allowedIntents: ["question", "analysis_request"],
      forbiddenTopics: ["investment advice", "insider trading"],
      preferredStrategy: "reflexion",
      defaultBehavior: {
        reasoningDepth: 5,
        confidenceThreshold: 0.8,
        creativityLevel: 0.2,
        toolUsePreference: 0.7,
      },
      requiredMCPServers: ["bloomberg-mcp", "risk-engine"],
      toolAllowlist: ["market_data_query", "risk_assessment"],
      domainTags: ["finance", "trading", "compliance"],
    });
    expect(result.name).toBe("FinanceAgent");
    expect(result.preferredStrategy).toBe("reflexion");
    expect(result.defaultBehavior.reasoningDepth).toBe(5);
    expect(result.requiredMCPServers).toContain("bloomberg-mcp");
    expect(result.domainTags).toContain("compliance");
  });

  it("parses a complete SRE persona", () => {
    const result = DomainPersonaSchema.parse({
      name: "SREAgent",
      systemPrompt: "You are an SRE agent. Prioritize availability.",
      allowedIntents: ["command", "debugging", "analysis_request"],
      forbiddenTopics: [],
      preferredStrategy: "react",
      defaultBehavior: {
        reasoningDepth: 3,
        toolUsePreference: 0.9,
        creativityLevel: 0.1,
      },
      requiredMCPServers: ["datadog-mcp", "pagerduty-mcp", "kubernetes-mcp"],
      toolAllowlist: ["get_metrics", "restart_service", "create_incident"],
      domainTags: ["sre", "infrastructure", "kubernetes"],
    });
    expect(result.name).toBe("SREAgent");
    expect(result.preferredStrategy).toBe("react");
    expect(result.defaultBehavior.toolUsePreference).toBe(0.9);
  });
});

// ---------------------------------------------------------------------------
// File-based Validation — domains/*/persona.json
// ---------------------------------------------------------------------------

describe("DomainPersonaSchema — File Validation", () => {
  it("domains/finance/persona.json exists", () => {
    expect(existsSync(resolve(ROOT, "domains/finance/persona.json"))).toBe(true);
  });

  it("domains/sre/persona.json exists", () => {
    expect(existsSync(resolve(ROOT, "domains/sre/persona.json"))).toBe(true);
  });

  it("validates domains/finance/persona.json against schema", () => {
    const raw = JSON.parse(readFileSync(resolve(ROOT, "domains/finance/persona.json"), "utf-8"));
    const result = DomainPersonaSchema.parse(raw);
    expect(result.name).toBe("FinanceAgent");
    expect(result.preferredStrategy).toBe("reflexion");
    expect(result.forbiddenTopics.length).toBeGreaterThan(0);
    expect(result.allowedIntents.length).toBeGreaterThan(0);
    expect(result.requiredMCPServers.length).toBeGreaterThan(0);
    expect(result.toolAllowlist.length).toBeGreaterThan(0);
    expect(result.domainTags.length).toBeGreaterThan(0);
    expect(result.defaultBehavior.confidenceThreshold).toBe(0.8);
  });

  it("validates domains/sre/persona.json against schema", () => {
    const raw = JSON.parse(readFileSync(resolve(ROOT, "domains/sre/persona.json"), "utf-8"));
    const result = DomainPersonaSchema.parse(raw);
    expect(result.name).toBe("SREAgent");
    expect(result.preferredStrategy).toBe("react");
    expect(result.defaultBehavior.toolUsePreference).toBe(0.9);
    expect(result.defaultBehavior.reasoningDepth).toBe(3);
    expect(result.forbiddenTopics).toEqual([]);
    expect(result.requiredMCPServers).toContain("kubernetes-mcp");
  });

  it("finance persona has correct differentiation profile", () => {
    const raw = JSON.parse(readFileSync(resolve(ROOT, "domains/finance/persona.json"), "utf-8"));
    const persona = DomainPersonaSchema.parse(raw);

    // Finance = conservative, careful, compliance-heavy
    expect(persona.defaultBehavior.creativityLevel).toBeLessThan(0.5);
    expect(persona.defaultBehavior.confidenceThreshold).toBeGreaterThan(0.7);
    expect(persona.forbiddenTopics.length).toBeGreaterThan(0);
    expect(persona.preferredStrategy).toBe("reflexion"); // self-check
  });

  it("SRE persona has correct differentiation profile", () => {
    const raw = JSON.parse(readFileSync(resolve(ROOT, "domains/sre/persona.json"), "utf-8"));
    const persona = DomainPersonaSchema.parse(raw);

    // SRE = fast, tool-heavy, action-oriented
    expect(persona.defaultBehavior.toolUsePreference).toBeGreaterThan(0.8);
    expect(persona.defaultBehavior.reasoningDepth).toBeLessThan(4);
    expect(persona.preferredStrategy).toBe("react"); // action-oriented
    expect(persona.forbiddenTopics).toEqual([]); // SRE needs full access
  });

  it("finance and SRE personas are meaningfully different", () => {
    const fin = DomainPersonaSchema.parse(JSON.parse(readFileSync(resolve(ROOT, "domains/finance/persona.json"), "utf-8")));
    const sre = DomainPersonaSchema.parse(JSON.parse(readFileSync(resolve(ROOT, "domains/sre/persona.json"), "utf-8")));

    // Different strategies
    expect(fin.preferredStrategy).not.toBe(sre.preferredStrategy);
    // Different risk profiles
    expect(fin.defaultBehavior.creativityLevel).not.toBe(sre.defaultBehavior.creativityLevel);
    // Different tool sets
    expect(fin.requiredMCPServers).not.toEqual(sre.requiredMCPServers);
    // Different names
    expect(fin.name).not.toBe(sre.name);
    // Different intent scopes
    expect(fin.allowedIntents).not.toEqual(sre.allowedIntents);
  });
});
