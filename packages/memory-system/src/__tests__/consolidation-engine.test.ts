import { describe, it, expect, beforeEach } from "vitest";
import { ConsolidationEngine } from "../consolidation-engine.js";
import { InMemoryEpisodicStore } from "../episodic/store.js";
import { InMemorySemanticStore } from "../semantic/store.js";
import { NoOpEmbeddingProvider } from "../embeddings/noop-provider.js";
import type { Episode, KnowledgeTriple } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

const DIM = 4;
const DAY_MS = 86400000;

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    actors: ["user-1"],
    actions: ["asked question"],
    context: {},
    importance: 0.5,
    embedding: [0.5, 0.5, 0.5, 0.5],
    ...overrides,
  };
}

function makeTriple(overrides: Partial<KnowledgeTriple> = {}): KnowledgeTriple {
  const now = Date.now();
  return {
    id: randomUUID(),
    subject: "agent",
    predicate: "performed",
    object: "task",
    confidence: 0.8,
    createdAt: now,
    updatedAt: now,
    version: 1,
    embedding: [0.5, 0.5, 0.5, 0.5],
    ...overrides,
  };
}

describe("ConsolidationEngine", () => {
  let episodicStore: InMemoryEpisodicStore;
  let semanticStore: InMemorySemanticStore;
  let engine: ConsolidationEngine;

  beforeEach(() => {
    episodicStore = new InMemoryEpisodicStore();
    semanticStore = new InMemorySemanticStore();
    engine = new ConsolidationEngine(
      episodicStore,
      semanticStore,
      new NoOpEmbeddingProvider(DIM),
      {
        uPromote: 0.3,
        uPrune: -0.1,
        tMaxAge: 7 * DAY_MS,
        thetaMerge: 0.85,
        episodicCapacity: 5,
        semanticCapacity: 5,
        minMaturity: 2,
      },
    );
  });

  describe("promote", () => {
    it("promotes high-utility episodes to semantic triples", async () => {
      // Add episodes with high utility
      await episodicStore.append(makeEpisode({ utility: 0.8, outcome: "success" }));
      await episodicStore.append(makeEpisode({ utility: 0.9, outcome: "success" }));

      const stats = await engine.consolidate();
      expect(stats.promoted).toBeGreaterThan(0);
      expect(await semanticStore.count()).toBeGreaterThan(0);
    });

    it("does not promote low-utility episodes", async () => {
      await episodicStore.append(makeEpisode({ utility: 0.1 }));
      await episodicStore.append(makeEpisode({ utility: 0.2 }));

      const stats = await engine.consolidate();
      expect(stats.promoted).toBe(0);
    });
  });

  describe("merge", () => {
    it("merges similar semantic triples", async () => {
      // Two triples with identical embeddings (cosine = 1.0 > 0.85)
      await semanticStore.upsert(makeTriple({
        embedding: [1, 0, 0, 0],
        utility: 0.5,
        sourceCount: 3,
      }));
      await semanticStore.upsert(makeTriple({
        embedding: [1, 0, 0, 0],
        utility: 0.7,
        sourceCount: 2,
      }));

      const stats = await engine.consolidate();
      expect(stats.merged).toBeGreaterThan(0);
      // After merge, should have 1 triple
      expect(await semanticStore.count()).toBe(1);
    });

    it("does not merge dissimilar triples", async () => {
      await semanticStore.upsert(makeTriple({ embedding: [1, 0, 0, 0] }));
      await semanticStore.upsert(makeTriple({ embedding: [0, 1, 0, 0] }));

      const stats = await engine.consolidate();
      expect(stats.merged).toBe(0);
      expect(await semanticStore.count()).toBe(2);
    });
  });

  describe("prune", () => {
    it("prunes stale low-utility entries that meet maturity threshold", async () => {
      // Old episode with low utility and enough retrievals
      await episodicStore.append(makeEpisode({
        utility: -0.5,
        timestamp: Date.now() - 10 * DAY_MS,
        retrievalCount: 5,
      }));
      // Recent episode — should not be pruned
      await episodicStore.append(makeEpisode({ utility: -0.5, retrievalCount: 5 }));

      const stats = await engine.consolidate();
      expect(stats.pruned).toBeGreaterThanOrEqual(1);
      expect(await episodicStore.count()).toBe(1);
    });

    it("enforces episodic capacity by evicting lowest-utility", async () => {
      // Add 8 episodes (capacity is 5)
      for (let i = 0; i < 8; i++) {
        await episodicStore.append(makeEpisode({ utility: i * 0.1, importance: i * 0.1 }));
      }

      const stats = await engine.consolidate();
      expect(stats.pruned).toBeGreaterThanOrEqual(3); // 8 - 5 = 3 evicted
      expect(await episodicStore.count()).toBeLessThanOrEqual(5);
    });

    it("does not prune immature entries", async () => {
      // Low utility but only 1 retrieval (below minMaturity=2)
      await episodicStore.append(makeEpisode({
        utility: -0.5,
        timestamp: Date.now() - 10 * DAY_MS,
        retrievalCount: 1,
      }));

      const stats = await engine.consolidate();
      // Should still be there (not pruned by utility/age/maturity gate)
      // It might be pruned by capacity, but with only 1 episode and cap=5, it shouldn't be
      expect(await episodicStore.count()).toBe(1);
    });
  });

  describe("full consolidation", () => {
    it("runs all phases without errors on empty stores", async () => {
      const stats = await engine.consolidate();
      expect(stats.promoted).toBe(0);
      expect(stats.merged).toBe(0);
      expect(stats.pruned).toBe(0);
    });
  });
});
