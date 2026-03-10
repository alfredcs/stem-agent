import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProceduralMemory } from "../procedural/procedural-memory.js";
import { InMemoryProceduralStore } from "../procedural/store.js";
import { NoOpEmbeddingProvider } from "../embeddings/noop-provider.js";
import type { Procedure } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

function makeProcedure(overrides: Partial<Procedure> = {}): Procedure {
  return {
    id: randomUUID(),
    name: "deploy-service",
    description: "Deploy a microservice to production",
    steps: ["build", "test", "deploy"],
    preconditions: ["tests pass"],
    postconditions: ["service running"],
    successRate: 0.8,
    executionCount: 10,
    tags: ["deployment"],
    ...overrides,
  };
}

describe("InMemoryProceduralStore", () => {
  let store: InMemoryProceduralStore;

  beforeEach(() => {
    store = new InMemoryProceduralStore();
  });

  it("upsert inserts a new procedure", async () => {
    await store.upsert(makeProcedure());
    expect(await store.count()).toBe(1);
  });

  it("upsert overwrites an existing procedure", async () => {
    const proc = makeProcedure();
    await store.upsert(proc);
    await store.upsert({ ...proc, description: "updated" });

    const result = await store.get(proc.id);
    expect(result!.description).toBe("updated");
    expect(await store.count()).toBe(1);
  });

  it("get returns null for unknown id", async () => {
    expect(await store.get("nonexistent")).toBeNull();
  });

  it("getByName returns matching procedure", async () => {
    await store.upsert(makeProcedure({ name: "run-tests" }));
    const result = await store.getByName("run-tests");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("run-tests");
  });

  it("getByName returns null for unknown name", async () => {
    expect(await store.getByName("nope")).toBeNull();
  });

  it("searchByEmbedding ranks by cosine similarity", async () => {
    const p1 = makeProcedure({ embedding: [1, 0, 0, 0] });
    const p2 = makeProcedure({ embedding: [0, 1, 0, 0] });

    await store.upsert(p1);
    await store.upsert(p2);

    const results = await store.searchByEmbedding([1, 0, 0, 0], 1);
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(p1.id);
  });

  it("searchByEmbedding skips procedures without embeddings", async () => {
    await store.upsert(makeProcedure()); // no embedding
    await store.upsert(makeProcedure({ embedding: [1, 0] }));

    const results = await store.searchByEmbedding([1, 0], 10);
    expect(results).toHaveLength(1);
  });

  it("searchByTags returns matching procedures", async () => {
    await store.upsert(makeProcedure({ tags: ["ci", "testing"] }));
    await store.upsert(makeProcedure({ tags: ["deployment"] }));

    const results = await store.searchByTags(["ci"]);
    expect(results).toHaveLength(1);
  });

  it("searchByTags matches any of the provided tags", async () => {
    await store.upsert(makeProcedure({ tags: ["ci"] }));
    await store.upsert(makeProcedure({ tags: ["deployment"] }));

    const results = await store.searchByTags(["ci", "deployment"]);
    expect(results).toHaveLength(2);
  });

  it("delete removes a procedure", async () => {
    const proc = makeProcedure();
    await store.upsert(proc);
    await store.delete(proc.id);
    expect(await store.count()).toBe(0);
  });

  it("getAll returns all procedures", async () => {
    await store.upsert(makeProcedure());
    await store.upsert(makeProcedure());
    const all = await store.getAll();
    expect(all).toHaveLength(2);
  });
});

describe("ProceduralMemory", () => {
  let memory: ProceduralMemory;
  let store: InMemoryProceduralStore;

  beforeEach(() => {
    store = new InMemoryProceduralStore();
    memory = new ProceduralMemory(store, new NoOpEmbeddingProvider(4), {
      procedureDeprecationThreshold: 0.2,
      procedureMinExecutions: 5,
    });
  });

  it("learns and retrieves a procedure by id", async () => {
    const proc = makeProcedure();
    await memory.learn(proc);

    const result = await memory.get(proc.id);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("deploy-service");
  });

  it("retrieves a procedure by name", async () => {
    await memory.learn(makeProcedure({ name: "run-tests" }));
    const result = await memory.getByName("run-tests");
    expect(result).not.toBeNull();
  });

  it("returns null for unknown id", async () => {
    expect(await memory.get("nonexistent")).toBeNull();
  });

  it("records successful outcome and updates success rate", async () => {
    const proc = makeProcedure({ successRate: 0.5, executionCount: 2 });
    await memory.learn(proc);
    await memory.recordOutcome(proc.id, true);

    const updated = await memory.get(proc.id);
    expect(updated!.executionCount).toBe(3);
    // (0.5 * 2 + 1) / 3 = 2/3
    expect(updated!.successRate).toBeCloseTo(2 / 3);
  });

  it("records failed outcome and updates success rate", async () => {
    const proc = makeProcedure({ successRate: 1.0, executionCount: 1 });
    await memory.learn(proc);
    await memory.recordOutcome(proc.id, false);

    const updated = await memory.get(proc.id);
    expect(updated!.executionCount).toBe(2);
    expect(updated!.successRate).toBeCloseTo(0.5);
  });

  it("recordOutcome is a no-op for missing procedure", async () => {
    // Should not throw
    await memory.recordOutcome("nonexistent", true);
  });

  it("recordOutcome updates lastUsed", async () => {
    const proc = makeProcedure();
    await memory.learn(proc);
    const before = Date.now();
    await memory.recordOutcome(proc.id, true);

    const updated = await memory.get(proc.id);
    expect(updated!.lastUsed).toBeGreaterThanOrEqual(before);
  });

  it("deprecates unreliable procedures", async () => {
    const reliable = makeProcedure({ successRate: 0.9, executionCount: 10 });
    const unreliable = makeProcedure({ successRate: 0.1, executionCount: 10 });
    await memory.learn(reliable);
    await memory.learn(unreliable);

    const deprecated = await memory.deprecateUnreliable();
    expect(deprecated).toHaveLength(1);
    expect(deprecated[0]).toBe(unreliable.id);
    expect(await memory.count()).toBe(1);
  });

  it("does not deprecate procedures with too few executions", async () => {
    const lowExec = makeProcedure({ successRate: 0.0, executionCount: 2 });
    await memory.learn(lowExec);

    const deprecated = await memory.deprecateUnreliable();
    expect(deprecated).toHaveLength(0);
  });

  it("searches by tags", async () => {
    await memory.learn(makeProcedure({ tags: ["ci"] }));
    await memory.learn(makeProcedure({ tags: ["deployment"] }));

    const results = await memory.searchByTags(["ci"]);
    expect(results).toHaveLength(1);
  });

  it("deletes a procedure", async () => {
    const proc = makeProcedure();
    await memory.learn(proc);
    await memory.delete(proc.id);
    expect(await memory.count()).toBe(0);
  });

  it("getBestProcedure returns result with NoOp embeddings (zero-vector match)", async () => {
    await memory.learn(makeProcedure());
    // NoOp returns zero vectors; cosine similarity is 0 but procedure still returned
    const result = await memory.getBestProcedure("deploy something");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("deploy-service");
  });
});
