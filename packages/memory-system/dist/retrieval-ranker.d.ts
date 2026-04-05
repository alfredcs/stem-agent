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
export interface RankerCandidate<T> {
    item: T;
    similarity: number;
}
export interface ScoredResult<T> {
    item: T;
    score: number;
    similarity: number;
}
export declare class RetrievalRanker {
    private readonly config;
    constructor(config?: Partial<RetrievalRankerConfig>);
    /**
     * Re-rank candidates by composite score.
     *
     * @param candidates - Items with similarity scores from vector search.
     * @param k - Number of results to return.
     * @param getUtility - Extract utility from item (defaults to 0).
     * @param getTimestamp - Extract timestamp from item (defaults to now).
     * @returns Top K items sorted by composite score.
     */
    rank<T>(candidates: RankerCandidate<T>[], k: number, getUtility: (item: T) => number, getTimestamp: (item: T) => number): ScoredResult<T>[];
}
//# sourceMappingURL=retrieval-ranker.d.ts.map