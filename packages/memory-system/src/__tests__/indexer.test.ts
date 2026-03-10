import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryIndexer } from "../indexer.js";
import { InMemoryEpisodicStore } from "../episodic/store.js";
import { InMemorySemanticStore } from "../semantic/store.js";
import { InMemoryProceduralStore } from "../procedural/store.js";
import type { Episode, KnowledgeTriple, Procedure } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    actors: ["user-1"],
    actions: ["action"],
    context: {},
    importance: 0.5,
    ...overrides,
  };
}

function makeTriple(overrides: Partial<KnowledgeTriple> = {}): KnowledgeTriple {
  return {
    id: randomUUID(),
    subject: "A",
    predicate: "is",
    object: "B",
    confidence: 1.0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    ...overrides,
  };
}

describe("MemoryIndexer", () => {
  let indexer: MemoryIndexer;
  let episodicStore: InMemoryEpisodicStore;
  let semanticStore: InMemorySemanticStore;
  let proceduralStore: InMemoryProceduralStore;

  beforeEach(() => {
    episodicStore = new InMemoryEpisodicStore();
    semanticStore = new InMemorySemanticStore();
    proceduralStore = new InMemoryProceduralStore();
    indexer = new MemoryIndexer({
      episodic: episodicStore,
      semantic: semanticStore,
      procedural: proceduralStore,
    });
  });

  afterEach(() => {
    indexer.stop();
  });

  it("pruneEpisodic returns 0 for empty store", async () => {
    const pruned = await indexer.pruneEpisodic();
    expect(pruned).toBe(0);
  });

  it("pruneEpisodic keeps top N% by importance", async () => {
    for (let i = 0; i < 10; i++) {
      await episodicStore.append(makeEpisode({ importance: i / 10 }));
    }

    const pruned = await indexer.pruneEpisodic(50);
    expect(pruned).toBe(5);
    expect(await episodicStore.count()).toBe(5);
  });

  it("pruneEpisodic keeps higher importance episodes", async () => {
    const low = makeEpisode({ importance: 0.1 });
    const high = makeEpisode({ importance: 0.9 });
    await episodicStore.append(low);
    await episodicStore.append(high);

    await indexer.pruneEpisodic(50);
    const remaining = await episodicStore.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(high.id);
  });

  it("pruneEpisodic with 100% keeps all", async () => {
    for (let i = 0; i < 5; i++) {
      await episodicStore.append(makeEpisode());
    }
    const pruned = await indexer.pruneEpisodic(100);
    expect(pruned).toBe(0);
    expect(await episodicStore.count()).toBe(5);
  });

  it("deduplicateSemantic removes duplicates keeping highest version", async () => {
    const t1 = makeTriple({ subject: "A", predicate: "is", object: "B", version: 1 });
    const t2 = makeTriple({ subject: "A", predicate: "is", object: "B", version: 3 });
    const t3 = makeTriple({ subject: "X", predicate: "has", object: "Y", version: 1 });

    await semanticStore.upsert(t1);
    await semanticStore.upsert(t2);
    await semanticStore.upsert(t3);

    const removed = await indexer.deduplicateSemantic();
    expect(removed).toBe(1);
    expect(await semanticStore.count()).toBe(2);

    // The surviving A-is-B triple should be the version 3 one
    expect(await semanticStore.get(t2.id)).not.toBeNull();
    expect(await semanticStore.get(t1.id)).toBeNull();
  });

  it("deduplicateSemantic returns 0 when no duplicates", async () => {
    await semanticStore.upsert(makeTriple({ subject: "A", predicate: "is", object: "B" }));
    await semanticStore.upsert(makeTriple({ subject: "X", predicate: "has", object: "Y" }));

    const removed = await indexer.deduplicateSemantic();
    expect(removed).toBe(0);
  });

  it("deduplicateSemantic returns 0 for empty store", async () => {
    const removed = await indexer.deduplicateSemantic();
    expect(removed).toBe(0);
  });

  it("stats returns counts from all stores", async () => {
    await episodicStore.append(makeEpisode());
    await episodicStore.append(makeEpisode());
    await semanticStore.upsert(makeTriple());

    const stats = await indexer.stats();
    expect(stats).toEqual({ episodic: 2, semantic: 1, procedural: 0 });
  });

  it("stats returns zeros for empty stores", async () => {
    const stats = await indexer.stats();
    expect(stats).toEqual({ episodic: 0, semantic: 0, procedural: 0 });
  });

  it("start and stop do not throw", () => {
    indexer.start(60000);
    indexer.stop();
  });

  it("double start does not create multiple timers", () => {
    indexer.start(60000);
    indexer.start(60000); // second call is a no-op
    indexer.stop();
  });

  it("double stop is safe", () => {
    indexer.start(60000);
    indexer.stop();
    indexer.stop(); // second call is a no-op
  });

  it("stop without start is safe", () => {
    indexer.stop();
  });

  it("runMaintenance runs without error on populated stores", async () => {
    await episodicStore.append(makeEpisode());
    await semanticStore.upsert(makeTriple());
    await expect(indexer.runMaintenance()).resolves.toBeUndefined();
  });

  it("runMaintenance runs without error on empty stores", async () => {
    await expect(indexer.runMaintenance()).resolves.toBeUndefined();
  });
});
