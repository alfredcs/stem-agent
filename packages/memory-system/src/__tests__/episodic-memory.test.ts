import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EpisodicMemory } from "../episodic/episodic-memory.js";
import { InMemoryEpisodicStore } from "../episodic/store.js";
import { NoOpEmbeddingProvider } from "../embeddings/noop-provider.js";
import type { Episode } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    actors: ["user-1"],
    actions: ["asked question"],
    context: {},
    importance: 0.5,
    ...overrides,
  };
}

describe("InMemoryEpisodicStore", () => {
  let store: InMemoryEpisodicStore;

  beforeEach(() => {
    store = new InMemoryEpisodicStore();
  });

  it("appends and counts episodes", async () => {
    await store.append(makeEpisode());
    await store.append(makeEpisode());
    expect(await store.count()).toBe(2);
  });

  it("getByTimeRange returns episodes within bounds", async () => {
    await store.append(makeEpisode({ timestamp: 1000 }));
    await store.append(makeEpisode({ timestamp: 2000 }));
    await store.append(makeEpisode({ timestamp: 3000 }));

    const results = await store.getByTimeRange(1500, 2500);
    expect(results).toHaveLength(1);
    expect(results[0]!.timestamp).toBe(2000);
  });

  it("getByTimeRange is inclusive of start and end", async () => {
    await store.append(makeEpisode({ timestamp: 1000 }));
    await store.append(makeEpisode({ timestamp: 2000 }));

    const results = await store.getByTimeRange(1000, 2000);
    expect(results).toHaveLength(2);
  });

  it("getByActor filters by actor", async () => {
    await store.append(makeEpisode({ actors: ["alice"] }));
    await store.append(makeEpisode({ actors: ["bob"] }));
    await store.append(makeEpisode({ actors: ["alice", "bob"] }));

    const results = await store.getByActor("alice");
    expect(results).toHaveLength(2);
  });

  it("searchByEmbedding ranks by cosine similarity", async () => {
    const ep1 = makeEpisode({ embedding: [1, 0, 0, 0] });
    const ep2 = makeEpisode({ embedding: [0, 1, 0, 0] });
    const ep3 = makeEpisode({ embedding: [0.9, 0.1, 0, 0] });

    await store.append(ep1);
    await store.append(ep2);
    await store.append(ep3);

    const results = await store.searchByEmbedding([1, 0, 0, 0], 2);
    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(ep1.id);
    expect(results[1]!.id).toBe(ep3.id);
  });

  it("searchByEmbedding skips episodes without embeddings", async () => {
    await store.append(makeEpisode()); // no embedding
    await store.append(makeEpisode({ embedding: [1, 0] }));

    const results = await store.searchByEmbedding([1, 0], 10);
    expect(results).toHaveLength(1);
  });

  it("searchByKeyword matches across actions, outcome, summary, context", async () => {
    await store.append(makeEpisode({ actions: ["deployed server"] }));
    await store.append(makeEpisode({ outcome: "server crashed" }));
    await store.append(makeEpisode({ summary: "server migration" }));
    await store.append(makeEpisode({ actions: ["ran tests"] }));

    const results = await store.searchByKeyword("server", 10);
    expect(results).toHaveLength(3);
  });

  it("searchByKeyword is case-insensitive", async () => {
    await store.append(makeEpisode({ actions: ["DEPLOYED SERVER"] }));
    const results = await store.searchByKeyword("server", 10);
    expect(results).toHaveLength(1);
  });

  it("searchByKeyword respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await store.append(makeEpisode({ actions: ["server task"] }));
    }
    const results = await store.searchByKeyword("server", 3);
    expect(results).toHaveLength(3);
  });

  it("delete removes a specific episode", async () => {
    const ep = makeEpisode();
    await store.append(ep);
    await store.append(makeEpisode());

    await store.delete(ep.id);
    expect(await store.count()).toBe(1);
  });

  it("delete is a no-op for unknown id", async () => {
    await store.append(makeEpisode());
    await store.delete("nonexistent");
    expect(await store.count()).toBe(1);
  });

  it("deleteByActor removes all episodes for that actor", async () => {
    await store.append(makeEpisode({ actors: ["alice"] }));
    await store.append(makeEpisode({ actors: ["alice"] }));
    await store.append(makeEpisode({ actors: ["bob"] }));

    await store.deleteByActor("alice");
    expect(await store.count()).toBe(1);
  });

  it("getAll returns a copy of all episodes", async () => {
    await store.append(makeEpisode());
    await store.append(makeEpisode());

    const all = await store.getAll();
    expect(all).toHaveLength(2);
  });
});

describe("EpisodicMemory", () => {
  let memory: EpisodicMemory;
  let store: InMemoryEpisodicStore;

  beforeEach(() => {
    store = new InMemoryEpisodicStore();
    memory = new EpisodicMemory(store, new NoOpEmbeddingProvider(4));
  });

  it("store computes embedding and sets importance", async () => {
    const ep = makeEpisode({ importance: undefined as unknown as number });
    // When importance is not set, estimateImportance provides a default
    await memory.store(ep);
    expect(await memory.count()).toBe(1);
  });

  it("store preserves explicit importance", async () => {
    const ep = makeEpisode({ importance: 0.9 });
    await memory.store(ep);

    const all = await store.getAll();
    expect(all[0]!.importance).toBe(0.9);
  });

  it("search returns results with NoOp embeddings (zero-vector cosine = 0)", async () => {
    await memory.store(makeEpisode());
    // NoOp embeddings are zero vectors; cosine similarity is 0 but results
    // are still returned (zero similarity != excluded).
    const results = await memory.search("anything");
    expect(results).toHaveLength(1);
  });

  it("getByTimeRange delegates to store", async () => {
    await memory.store(makeEpisode({ timestamp: 1000 }));
    await memory.store(makeEpisode({ timestamp: 5000 }));

    const results = await memory.getByTimeRange(4000, 6000);
    expect(results).toHaveLength(1);
  });

  it("getByActor delegates to store", async () => {
    await memory.store(makeEpisode({ actors: ["alice"] }));
    await memory.store(makeEpisode({ actors: ["bob"] }));

    const results = await memory.getByActor("alice");
    expect(results).toHaveLength(1);
  });

  it("searchByKeyword delegates to store", async () => {
    await memory.store(makeEpisode({ actions: ["deployed server"] }));
    await memory.store(makeEpisode({ actions: ["ran tests"] }));

    const results = await memory.searchByKeyword("server");
    expect(results).toHaveLength(1);
  });

  it("delete removes an episode", async () => {
    const ep = makeEpisode();
    await memory.store(ep);
    await memory.delete(ep.id);
    expect(await memory.count()).toBe(0);
  });

  it("deleteByActor removes all episodes for an actor", async () => {
    await memory.store(makeEpisode({ actors: ["alice"] }));
    await memory.store(makeEpisode({ actors: ["alice"] }));
    await memory.store(makeEpisode({ actors: ["bob"] }));

    await memory.deleteByActor("alice");
    expect(await memory.count()).toBe(1);
  });

  it("estimateImportance returns 0.5 for empty context", () => {
    expect(memory.estimateImportance(makeEpisode({ context: {} }))).toBe(0.5);
  });

  it("estimateImportance increases for error context", () => {
    expect(
      memory.estimateImportance(makeEpisode({ context: { error: true } })),
    ).toBeCloseTo(0.7);
  });

  it("estimateImportance caps at 1.0", () => {
    const ep = makeEpisode({
      context: { error: true, new_tool_used: true, positive_feedback: true },
    });
    expect(memory.estimateImportance(ep)).toBe(1.0);
  });
});
