import { describe, it, expect, vi } from "vitest";
import { SkillManager, InMemorySkillRegistry } from "../skills/index.js";
import { createMockMemory } from "./helpers.js";
import type { Skill, PerceptionResult, Episode } from "@stem-agent/shared";
import { SkillSchema, PerceptionResultSchema } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

function createSkill(overrides: Partial<Skill> = {}): Skill {
  return SkillSchema.parse({
    id: randomUUID(),
    name: "test-skill",
    description: "A test skill",
    trigger: {
      intentPatterns: ["search", "find"],
      domains: ["web"],
    },
    maturity: "committed",
    source: "plugin",
    successRate: 0.8,
    activationCount: 5,
    toolChain: [
      { toolName: "search", argumentTemplate: { query: "" } },
    ],
    ...overrides,
  });
}

function createPerception(overrides: Partial<PerceptionResult> = {}): PerceptionResult {
  return PerceptionResultSchema.parse({
    intent: "search for information",
    complexity: "simple",
    domain: "web",
    entities: [],
    ...overrides,
  });
}

describe("InMemorySkillRegistry", () => {
  it("registers and retrieves a skill", async () => {
    const registry = new InMemorySkillRegistry();
    const skill = createSkill();

    await registry.register(skill);
    const found = await registry.get(skill.id);

    expect(found).not.toBeNull();
    expect(found!.name).toBe("test-skill");
  });

  it("deregisters a skill", async () => {
    const registry = new InMemorySkillRegistry();
    const skill = createSkill();

    await registry.register(skill);
    await registry.deregister(skill.id);
    const found = await registry.get(skill.id);

    expect(found).toBeNull();
  });

  it("matches skills by intent pattern", async () => {
    const registry = new InMemorySkillRegistry();
    await registry.register(createSkill({ name: "searcher" }));
    await registry.register(createSkill({
      id: randomUUID(),
      name: "calculator",
      trigger: { intentPatterns: ["calculate", "math"], domains: ["math"], entityTypes: [] },
    }));

    const matches = await registry.match("search for web results");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].name).toBe("searcher");
  });

  it("matches skills by domain", async () => {
    const registry = new InMemorySkillRegistry();
    await registry.register(createSkill({
      trigger: { intentPatterns: [], domains: ["finance"], entityTypes: [] },
    }));

    const matches = await registry.match("get data", "finance");
    expect(matches.length).toBe(1);
  });

  it("prefers mature skills over committed", async () => {
    const registry = new InMemorySkillRegistry();
    await registry.register(createSkill({
      name: "committed-skill",
      maturity: "committed",
      successRate: 0.9,
    }));
    await registry.register(createSkill({
      id: randomUUID(),
      name: "mature-skill",
      maturity: "mature",
      successRate: 0.8,
      trigger: { intentPatterns: ["search"], domains: ["web"], entityTypes: [] },
    }));

    const matches = await registry.match("search the web");
    expect(matches[0].name).toBe("mature-skill");
  });

  it("records outcome and advances maturity", async () => {
    const registry = new InMemorySkillRegistry();
    const skill = createSkill({
      maturity: "progenitor",
      activationCount: 2,
      successRate: 0.8,
    });
    await registry.register(skill);

    // Third successful activation → should advance to committed
    await registry.recordOutcome(skill.id, true);
    const updated = await registry.get(skill.id);

    expect(updated!.maturity).toBe("committed");
    expect(updated!.activationCount).toBe(3);
  });

  it("removes unreliable crystallized skills (apoptosis)", async () => {
    const registry = new InMemorySkillRegistry();
    const skill = createSkill({
      maturity: "committed",
      source: "crystallized",
      activationCount: 9,
      successRate: 0.25,
    });
    await registry.register(skill);

    // 10th activation fails → below regression threshold → apoptosis
    await registry.recordOutcome(skill.id, false);
    const found = await registry.get(skill.id);

    expect(found).toBeNull();
  });

  it("does not remove plugin skills on low success", async () => {
    const registry = new InMemorySkillRegistry();
    const skill = createSkill({
      maturity: "committed",
      source: "plugin",
      activationCount: 9,
      successRate: 0.25,
    });
    await registry.register(skill);

    await registry.recordOutcome(skill.id, false);
    const found = await registry.get(skill.id);

    expect(found).not.toBeNull();
  });

  it("lists all skills", async () => {
    const registry = new InMemorySkillRegistry();
    await registry.register(createSkill({ name: "a" }));
    await registry.register(createSkill({ id: randomUUID(), name: "b" }));

    const all = await registry.listAll();
    expect(all.length).toBe(2);
  });
});

describe("SkillManager", () => {
  it("registers and removes plugin skills", async () => {
    const registry = new InMemorySkillRegistry();
    const manager = new SkillManager(registry, createMockMemory());

    const skill = await manager.registerPlugin({
      name: "my-plugin",
      description: "A manual plugin",
      trigger: { intentPatterns: ["greet"], domains: [], entityTypes: [] },
      maturity: "mature",
      source: "plugin",
      successRate: 1.0,
      toolChain: [],
      steps: ["Say hello"],
      activationCount: 0,
      tags: [],
    });

    expect(skill.id).toBeTruthy();
    expect(skill.source).toBe("plugin");

    const found = await registry.getByName("my-plugin");
    expect(found).not.toBeNull();

    await manager.removePluginByName("my-plugin");
    const gone = await registry.getByName("my-plugin");
    expect(gone).toBeNull();
  });

  it("matches skills from perception", async () => {
    const registry = new InMemorySkillRegistry();
    const manager = new SkillManager(registry, createMockMemory());
    await registry.register(createSkill());

    const matches = await manager.matchSkills(createPerception());
    expect(matches.length).toBe(1);
  });

  it("converts skill to execution plan with tool chain", () => {
    const registry = new InMemorySkillRegistry();
    const manager = new SkillManager(registry, createMockMemory());
    const skill = createSkill({
      toolChain: [
        { toolName: "search", argumentTemplate: { q: "test" } },
        { toolName: "summarize", argumentTemplate: {} },
      ],
    });

    const plan = manager.skillToPlan(skill, "find info");
    expect(plan.steps.length).toBe(2);
    expect(plan.steps[0].actionType).toBe("tool_call");
    expect(plan.steps[0].toolName).toBe("search");
    expect(plan.steps[1].dependsOn).toEqual([1]);
  });

  it("converts skill to execution plan with procedure steps", () => {
    const registry = new InMemorySkillRegistry();
    const manager = new SkillManager(registry, createMockMemory());
    const skill = createSkill({
      toolChain: [],
      steps: ["Analyze input", "Generate response", "Format output"],
    });

    const plan = manager.skillToPlan(skill, "process data");
    expect(plan.steps.length).toBe(3);
    expect(plan.steps[0].actionType).toBe("reasoning");
    expect(plan.steps[2].actionType).toBe("response");
  });

  it("crystallizes skills from repeated episode patterns", async () => {
    const episodes: Episode[] = Array.from({ length: 5 }, (_, i) => ({
      id: randomUUID(),
      timestamp: Date.now() - i * 1000,
      actors: ["user1"],
      actions: ["search"],
      context: { domain: "weather" },
      outcome: "completed",
      importance: 0.5,
      summary: `Task search-${i}: completed weather lookup`,
    }));

    const memory = createMockMemory({
      recall: async () => episodes,
    });
    const registry = new InMemorySkillRegistry();
    const manager = new SkillManager(registry, memory);

    const newSkills = await manager.tryCrystallize();
    expect(newSkills.length).toBeGreaterThanOrEqual(1);
    expect(newSkills[0].maturity).toBe("progenitor");
    expect(newSkills[0].source).toBe("crystallized");
  });

  it("does not crystallize duplicate skills", async () => {
    const episodes: Episode[] = Array.from({ length: 5 }, (_, i) => ({
      id: randomUUID(),
      timestamp: Date.now() - i * 1000,
      actors: ["user1"],
      actions: ["search"],
      context: { domain: "weather" },
      outcome: "completed",
      importance: 0.5,
      summary: `Task search-${i}: completed weather lookup`,
    }));

    const memory = createMockMemory({
      recall: async () => episodes,
    });
    const registry = new InMemorySkillRegistry();
    const manager = new SkillManager(registry, memory);

    const first = await manager.tryCrystallize();
    const second = await manager.tryCrystallize();

    expect(first.length).toBeGreaterThanOrEqual(1);
    expect(second.length).toBe(0);
  });

  it("does not crystallize with too few episodes", async () => {
    const episodes: Episode[] = [{
      id: randomUUID(),
      timestamp: Date.now(),
      actors: ["user1"],
      actions: ["search"],
      context: {},
      outcome: "completed",
      importance: 0.5,
    }];

    const memory = createMockMemory({
      recall: async () => episodes,
    });
    const registry = new InMemorySkillRegistry();
    const manager = new SkillManager(registry, memory);

    const newSkills = await manager.tryCrystallize();
    expect(newSkills.length).toBe(0);
  });
});
