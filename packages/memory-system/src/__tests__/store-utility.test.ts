import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEpisodicStore } from "../episodic/store.js";
import { InMemorySemanticStore } from "../semantic/store.js";
import type { Episode, KnowledgeTriple } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    actors: ["user-1"],
    actions: ["test"],
    context: {},
    importance: 0.5,
    ...overrides,
  };
}

function makeTriple(overrides: Partial<KnowledgeTriple> = {}): KnowledgeTriple {
  const now = Date.now();
  return {
    id: randomUUID(),
    subject: "s",
    predicate: "p",
    object: "o",
    confidence: 0.8,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
}

describe("InMemoryEpisodicStore — utility methods", () => {
  let store: InMemoryEpisodicStore;

  beforeEach(() => {
    store = new InMemoryEpisodicStore();
  });

  it("get returns episode by id", async () => {
    const ep = makeEpisode();
    await store.append(ep);
    const found = await store.get(ep.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(ep.id);
  });

  it("get returns null for unknown id", async () => {
    expect(await store.get(randomUUID())).toBeNull();
  });

  it("updateUtility persists utility and retrievalCount", async () => {
    const ep = makeEpisode();
    await store.append(ep);

    await store.updateUtility(ep.id, 0.75, 3);

    const updated = await store.get(ep.id);
    expect(updated).not.toBeNull();
    expect((updated as Record<string, unknown>).utility).toBe(0.75);
    expect((updated as Record<string, unknown>).retrievalCount).toBe(3);
    expect((updated as Record<string, unknown>).lastRetrieved).toBeDefined();
  });

  it("updateUtility is a no-op for unknown id", async () => {
    // Should not throw
    await store.updateUtility(randomUUID(), 0.5, 1);
  });
});

describe("InMemorySemanticStore — utility methods", () => {
  let store: InMemorySemanticStore;

  beforeEach(() => {
    store = new InMemorySemanticStore();
  });

  it("updateUtility persists utility and retrievalCount", async () => {
    const triple = makeTriple();
    await store.upsert(triple);

    await store.updateUtility(triple.id, 0.9, 5);

    const updated = await store.get(triple.id);
    expect(updated).not.toBeNull();
    expect(updated!.utility).toBe(0.9);
    expect(updated!.retrievalCount).toBe(5);
    expect(updated!.lastRetrieved).toBeDefined();
  });

  it("merge replaces multiple triples with one", async () => {
    const t1 = makeTriple();
    const t2 = makeTriple();
    const merged = makeTriple({ subject: "merged" });

    await store.upsert(t1);
    await store.upsert(t2);
    expect(await store.count()).toBe(2);

    await store.merge([t1.id, t2.id], merged);

    expect(await store.count()).toBe(1);
    expect(await store.get(t1.id)).toBeNull();
    expect(await store.get(t2.id)).toBeNull();
    const result = await store.get(merged.id);
    expect(result).not.toBeNull();
    expect(result!.subject).toBe("merged");
  });
});
