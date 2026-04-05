/**
 * Retrieval Ranker — composite scoring for utility-biased memory retrieval (ATLAS integration).
 *
 * Re-ranks memory candidates using:
 *   score = similarity + β·sigmoid(utility) + ρ·exp(-κ·age)
 *
 * Two-stage approach: vector store returns top 2K candidates by cosine similarity,
 * then this ranker re-ranks and returns top K.
 */

export interface RetrievalRankerConfig {
  /** Weight for utility component (default 0.3). */
  beta: number;
  /** Weight for recency component (default 0.2). */
  rho: number;
  /** Decay rate for recency in per-second units (default 1e-6, slow decay over days). */
  kappa: number;
}

const DEFAULT_CONFIG: RetrievalRankerConfig = {
  beta: 0.3,
  rho: 0.2,
  kappa: 1e-6,
};

export interface RankerCandidate<T> {
  item: T;
  similarity: number;
}

export interface ScoredResult<T> {
  item: T;
  score: number;
  similarity: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export class RetrievalRanker {
  private readonly config: RetrievalRankerConfig;

  constructor(config?: Partial<RetrievalRankerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Re-rank candidates by composite score.
   *
   * @param candidates - Items with similarity scores from vector search.
   * @param k - Number of results to return.
   * @param getUtility - Extract utility from item (defaults to 0).
   * @param getTimestamp - Extract timestamp from item (defaults to now).
   * @returns Top K items sorted by composite score.
   */
  rank<T>(
    candidates: RankerCandidate<T>[],
    k: number,
    getUtility: (item: T) => number,
    getTimestamp: (item: T) => number,
  ): ScoredResult<T>[] {
    const now = Date.now() / 1000; // seconds

    const scored = candidates.map((c) => {
      const utility = getUtility(c.item);
      const timestamp = getTimestamp(c.item) / 1000; // seconds
      const ageSeconds = Math.max(0, now - timestamp);

      const utilityComponent = this.config.beta * sigmoid(utility);
      const recencyComponent = this.config.rho * Math.exp(-this.config.kappa * ageSeconds);
      const score = c.similarity + utilityComponent + recencyComponent;

      return { item: c.item, score, similarity: c.similarity };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }
}
