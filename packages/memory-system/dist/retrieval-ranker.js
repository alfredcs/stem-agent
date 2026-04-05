/**
 * Retrieval Ranker — composite scoring for utility-biased memory retrieval (ATLAS integration).
 *
 * Re-ranks memory candidates using:
 *   score = similarity + β·sigmoid(utility) + ρ·exp(-κ·age)
 *
 * Two-stage approach: vector store returns top 2K candidates by cosine similarity,
 * then this ranker re-ranks and returns top K.
 */
const DEFAULT_CONFIG = {
    beta: 0.3,
    rho: 0.2,
    kappa: 1e-6,
};
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}
export class RetrievalRanker {
    config;
    constructor(config) {
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
    rank(candidates, k, getUtility, getTimestamp) {
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
//# sourceMappingURL=retrieval-ranker.js.map