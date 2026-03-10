import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SemanticMemory } from "../semantic/semantic-memory.js";
import { InMemorySemanticStore } from "../semantic/store.js";
import { NoOpEmbeddingProvider } from "../embeddings/noop-provider.js";
import type { KnowledgeTriple } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

function makeTriple(overrides: Partial<KnowledgeTriple> = {}): KnowledgeTriple {
  return {
    id: randomUUID(),
    subject: "TypeScript",
    predicate: "is",
    object: "a programming language",
    confidence: 1.0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    ...overrides,
  };
}

describe("InMemorySemanticStore", () => {
  let store: InMemorySemanticStore;

  beforeEach(() => {
    store = new InMemorySemanticStore();
  });

  it("upsert inserts a new triple", async () => {
    await store.upsert(makeTriple());
    expect(await store.count()).toBe(1);
  });

  it("upsert bumps version for existing triple", async () => {
    const triple = makeTriple();
    await store.upsert(triple);
    await store.upsert(triple);

    const result = await store.get(triple.id);
    expect(result!.version).toBe(2);
  });

  it("upsert updates updatedAt on existing triple", async () => {
    const triple = makeTriple({ updatedAt: 1000 });
    await store.upsert(triple);

    const before = Date.now();
    await store.upsert({ ...triple, object: "updated" });
    const result = await store.get(triple.id);
    expect(result!.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("get returns null for unknown id", async () => {
    expect(await store.get("nonexistent")).toBeNull();
  });

  it("searchByEmbedding ranks by cosine similarity", async () => {
    const t1 = makeTriple({ embedding: [1, 0, 0, 0] });
    const t2 = makeTriple({ embedding: [0, 1, 0, 0] });

    await store.upsert(t1);
    await store.upsert(t2);

    const results = await store.searchByEmbedding([1, 0, 0, 0], 1);
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(t1.id);
  });

  it("searchByEmbedding skips triples without embeddings", async () => {
    await store.upsert(makeTriple()); // no embedding
    await store.upsert(makeTriple({ embedding: [1, 0] }));

    const results = await store.searchByEmbedding([1, 0], 10);
    expect(results).toHaveLength(1);
  });

  it("searchBySubject is case-insensitive", async () => {
    await store.upsert(makeTriple({ subject: "TYPESCRIPT" }));
    const results = await store.searchBySubject("typescript");
    expect(results).toHaveLength(1);
  });

  it("searchBySubject matches partial subjects", async () => {
    await store.upsert(makeTriple({ subject: "TypeScript" }));
    const results = await store.searchBySubject("Type");
    expect(results).toHaveLength(1);
  });

  it("delete removes a triple", async () => {
    const triple = makeTriple();
    await store.upsert(triple);
    await store.delete(triple.id);
    expect(await store.count()).toBe(0);
  });

  it("getAll returns all stored triples", async () => {
    await store.upsert(makeTriple());
    await store.upsert(makeTriple());
    const all = await store.getAll();
    expect(all).toHaveLength(2);
  });
});

describe("SemanticMemory", () => {
  let memory: SemanticMemory;
  let store: InMemorySemanticStore;

  beforeEach(() => {
    store = new InMemorySemanticStore();
    memory = new SemanticMemory(store, new NoOpEmbeddingProvider(4));
  });

  it("stores and counts triples", async () => {
    await memory.store(makeTriple());
    await memory.store(makeTriple());
    expect(await memory.count()).toBe(2);
  });

  it("retrieves a triple by ID", async () => {
    const triple = makeTriple();
    await memory.store(triple);

    const result = await memory.get(triple.id);
    expect(result).not.toBeNull();
    expect(result!.subject).toBe("TypeScript");
  });

  it("returns null for unknown ID", async () => {
    expect(await memory.get("nonexistent")).toBeNull();
  });

  it("update bumps version via upsert", async () => {
    const triple = makeTriple();
    await memory.store(triple);
    await memory.update({ ...triple, object: "a typed language" });

    const result = await memory.get(triple.id);
    expect(result!.object).toBe("a typed language");
    expect(result!.version).toBe(2);
  });

  it("searches by subject", async () => {
    await memory.store(makeTriple({ subject: "Python" }));
    await memory.store(makeTriple({ subject: "TypeScript" }));

    const results = await memory.searchBySubject("Python");
    expect(results).toHaveLength(1);
    expect(results[0]!.subject).toBe("Python");
  });

  it("search returns results with NoOp embeddings (zero-vector cosine = 0)", async () => {
    await memory.store(makeTriple());
    // Zero vectors still pass the embedding filter; cosine similarity is 0
    const results = await memory.search("anything");
    expect(results).toHaveLength(1);
  });

  it("deletes a triple", async () => {
    const triple = makeTriple();
    await memory.store(triple);
    await memory.delete(triple.id);

    expect(await memory.count()).toBe(0);
    expect(await memory.get(triple.id)).toBeNull();
  });

  it("exports all triples", async () => {
    await memory.store(makeTriple());
    await memory.store(makeTriple());

    const exported = await memory.exportTriples();
    expect(exported).toHaveLength(2);
  });

  it("imports triples and returns count", async () => {
    const triples = [makeTriple(), makeTriple()];
    const count = await memory.importTriples(triples);
    expect(count).toBe(2);
    expect(await memory.count()).toBe(2);
  });

  it("import of empty array returns 0", async () => {
    const count = await memory.importTriples([]);
    expect(count).toBe(0);
  });
});
