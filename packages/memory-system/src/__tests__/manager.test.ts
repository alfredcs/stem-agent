import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryManager } from "../manager.js";
import { EpisodicMemory } from "../episodic/episodic-memory.js";
import { SemanticMemory } from "../semantic/semantic-memory.js";
import { ProceduralMemory } from "../procedural/procedural-memory.js";
import { UserContextManager } from "../user-context/user-context-manager.js";
import { InMemoryEpisodicStore } from "../episodic/store.js";
import { InMemorySemanticStore } from "../semantic/store.js";
import { InMemoryProceduralStore } from "../procedural/store.js";
import { InMemoryUserContextStore } from "../user-context/store.js";
import { NoOpEmbeddingProvider } from "../embeddings/noop-provider.js";
import { MemoryIndexer } from "../indexer.js";
import type { Episode, KnowledgeTriple, Procedure } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    actors: ["user-1"],
    actions: ["test action"],
    context: {},
    importance: 0.5,
    ...overrides,
  };
}

function makeTriple(overrides: Partial<KnowledgeTriple> = {}): KnowledgeTriple {
  return {
    id: randomUUID(),
    subject: "test",
    predicate: "is",
    object: "a test",
    confidence: 1.0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    ...overrides,
  };
}

function makeProcedure(overrides: Partial<Procedure> = {}): Procedure {
  return {
    id: randomUUID(),
    name: "test-proc",
    description: "A test procedure",
    steps: ["step1"],
    preconditions: [],
    postconditions: [],
    successRate: 0.8,
    executionCount: 5,
    tags: [],
    ...overrides,
  };
}

describe("MemoryManager", () => {
  let manager: MemoryManager;
  let episodicStore: InMemoryEpisodicStore;
  let semanticStore: InMemorySemanticStore;
  let proceduralStore: InMemoryProceduralStore;
  let userContextStore: InMemoryUserContextStore;
  let indexer: MemoryIndexer;
  const embeddings = new NoOpEmbeddingProvider(4);

  beforeEach(() => {
    episodicStore = new InMemoryEpisodicStore();
    semanticStore = new InMemorySemanticStore();
    proceduralStore = new InMemoryProceduralStore();
    userContextStore = new InMemoryUserContextStore();

    indexer = new MemoryIndexer({
      episodic: episodicStore,
      semantic: semanticStore,
      procedural: proceduralStore,
    });

    manager = new MemoryManager({
      episodic: new EpisodicMemory(episodicStore, embeddings),
      semantic: new SemanticMemory(semanticStore, embeddings),
      procedural: new ProceduralMemory(proceduralStore, embeddings),
      userContext: new UserContextManager(userContextStore),
      indexer,
    });
  });

  it("remember stores an episode", async () => {
    await manager.remember(makeEpisode());
    expect(await episodicStore.count()).toBe(1);
  });

  it("recall returns results with NoOp embeddings (zero-vector match)", async () => {
    await manager.remember(makeEpisode());
    const results = await manager.recall("anything");
    expect(results).toHaveLength(1);
  });

  it("recall with limit parameter", async () => {
    await manager.remember(makeEpisode());
    const results = await manager.recall("anything", 5);
    expect(results).toHaveLength(1);
  });

  it("learn stores a procedure", async () => {
    await manager.learn(makeProcedure());
    expect(await proceduralStore.count()).toBe(1);
  });

  it("storeKnowledge stores a triple", async () => {
    await manager.storeKnowledge(makeTriple());
    expect(await semanticStore.count()).toBe(1);
  });

  it("searchKnowledge returns results with NoOp embeddings", async () => {
    await manager.storeKnowledge(makeTriple());
    const results = await manager.searchKnowledge("anything");
    expect(results).toHaveLength(1);
  });

  it("getContext returns a caller context with correct ids", async () => {
    const ctx = await manager.getContext("user-1", "session-1");
    expect(ctx.callerId).toBe("user-1");
    expect(ctx.sessionId).toBe("session-1");
  });

  it("getCallerProfile returns a profile", async () => {
    const profile = await manager.getCallerProfile("user-1");
    expect(profile.callerId).toBe("user-1");
    expect(profile.totalInteractions).toBe(0);
  });

  it("updateCallerProfile updates the profile", async () => {
    await manager.updateCallerProfile("user-1", { formality: 0.9 });
    const profile = await manager.getCallerProfile("user-1");
    expect(profile.totalInteractions).toBe(1);
  });

  it("getBestProcedure returns result with NoOp embeddings", async () => {
    await manager.learn(makeProcedure());
    const result = await manager.getBestProcedure("deploy something");
    expect(result).not.toBeNull();
  });

  it("forget removes caller data from user context and episodic", async () => {
    await manager.remember(makeEpisode({ actors: ["user-1"] }));
    await manager.remember(makeEpisode({ actors: ["user-2"] }));
    await manager.getCallerProfile("user-1");

    await manager.forget("user-1");

    // user-1 episodes gone, user-2 remains
    expect(await episodicStore.count()).toBe(1);
    // Profile is recreated as fresh
    const profile = await manager.getCallerProfile("user-1");
    expect(profile.totalInteractions).toBe(0);
  });

  it("shutdown stops the indexer", async () => {
    indexer.start(60000);
    await manager.shutdown();
    // Starting and then shutting down should not throw
  });

  it("shutdown without indexer does not throw", async () => {
    const managerNoIndexer = new MemoryManager({
      episodic: new EpisodicMemory(episodicStore, embeddings),
      semantic: new SemanticMemory(semanticStore, embeddings),
      procedural: new ProceduralMemory(proceduralStore, embeddings),
      userContext: new UserContextManager(userContextStore),
    });
    await expect(managerNoIndexer.shutdown()).resolves.toBeUndefined();
  });

  it("multiple operations in sequence", async () => {
    await manager.remember(makeEpisode());
    await manager.storeKnowledge(makeTriple());
    await manager.learn(makeProcedure());
    await manager.getCallerProfile("user-1");
    await manager.getContext("user-1", "s1");

    expect(await episodicStore.count()).toBe(1);
    expect(await semanticStore.count()).toBe(1);
    expect(await proceduralStore.count()).toBe(1);
  });
});
