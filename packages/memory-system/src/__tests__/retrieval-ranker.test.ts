import { describe, it, expect } from "vitest";
import { RetrievalRanker } from "../retrieval-ranker.js";

interface MockItem {
  id: string;
  utility: number;
  timestamp: number;
}

function makeItem(id: string, utility: number, ageMs: number): MockItem {
  return { id, utility, timestamp: Date.now() - ageMs };
}

describe("RetrievalRanker", () => {
  it("returns top K items sorted by composite score", () => {
    const ranker = new RetrievalRanker({ beta: 0.5, rho: 0.2, kappa: 1e-6 });

    const candidates = [
      { item: makeItem("a", -2.0, 1000), similarity: 0.9 },
      { item: makeItem("b", 3.0, 1000), similarity: 0.8 },
      { item: makeItem("c", 0.5, 1000), similarity: 0.85 },
    ];

    const results = ranker.rank(
      candidates,
      2,
      (item) => item.utility,
      (item) => item.timestamp,
    );

    expect(results).toHaveLength(2);
    // b has very high utility (sigmoid(3.0) ≈ 0.95) vs a's low (sigmoid(-2) ≈ 0.12)
    // b: 0.8 + 0.5*0.95 + recency ≈ 1.275
    // a: 0.9 + 0.5*0.12 + recency ≈ 0.96
    expect(results[0].item.id).toBe("b");
  });

  it("high-utility old memories can beat low-utility recent ones", () => {
    const ranker = new RetrievalRanker({ beta: 0.5, rho: 0.1, kappa: 1e-5 });

    const DAY_MS = 86400000;
    const candidates = [
      { item: makeItem("old-useful", 2.0, 30 * DAY_MS), similarity: 0.7 },
      { item: makeItem("new-useless", -1.0, 1000), similarity: 0.7 },
    ];

    const results = ranker.rank(
      candidates,
      2,
      (item) => item.utility,
      (item) => item.timestamp,
    );

    // old-useful should rank first due to high utility despite age
    expect(results[0].item.id).toBe("old-useful");
  });

  it("defaults to similarity-only when utility is 0", () => {
    const ranker = new RetrievalRanker();

    const candidates = [
      { item: makeItem("a", 0, 0), similarity: 0.9 },
      { item: makeItem("b", 0, 0), similarity: 0.95 },
    ];

    const results = ranker.rank(
      candidates,
      2,
      (item) => item.utility,
      (item) => item.timestamp,
    );

    // b has higher similarity so should rank first
    expect(results[0].item.id).toBe("b");
  });

  it("returns empty array for empty candidates", () => {
    const ranker = new RetrievalRanker();
    const results = ranker.rank(
      [],
      5,
      () => 0,
      () => Date.now(),
    );
    expect(results).toHaveLength(0);
  });

  it("respects k limit", () => {
    const ranker = new RetrievalRanker();
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      item: makeItem(`item-${i}`, 0.5, 0),
      similarity: 0.5,
    }));

    const results = ranker.rank(
      candidates,
      3,
      (item) => item.utility,
      (item) => item.timestamp,
    );
    expect(results).toHaveLength(3);
  });
});
