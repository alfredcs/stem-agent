import { createLogger } from "@stem-agent/shared";
import { UtilityTracker } from "../utility-tracker.js";
import { RetrievalRanker } from "../retrieval-ranker.js";
/**
 * Episodic memory — sequential records of past interactions/events.
 *
 * Supports retrieval by time range, vector similarity, keyword, and actor.
 * Automatically scores importance on storage.
 */
export class EpisodicMemory {
    _store;
    embeddings;
    log;
    utilityTracker = new UtilityTracker();
    ranker = new RetrievalRanker();
    constructor(store, embeddings, logger) {
        this._store = store;
        this.embeddings = embeddings;
        this.log = logger ?? createLogger("episodic-memory");
    }
    /** Store a new episode, computing its embedding and importance score. */
    async store(episode) {
        const text = this.episodeToText(episode);
        const embedding = await this.embeddings.embed(text);
        const scored = {
            ...episode,
            embedding,
            importance: episode.importance ?? this.estimateImportance(episode),
        };
        await this._store.append(scored);
        this.log.debug({ id: episode.id }, "episode stored");
    }
    /** Search episodes by semantic similarity, re-ranked by utility and recency. */
    async search(query, limit = 10) {
        const embedding = await this.embeddings.embed(query);
        // Over-fetch 2x for re-ranking headroom
        const candidates = await this._store.searchByEmbedding(embedding, limit * 2);
        if (candidates.length === 0)
            return [];
        // Compute similarity scores for re-ranking (store returns sorted by similarity)
        const withSimilarity = candidates.map((ep, idx) => ({
            item: ep,
            // Approximate similarity from rank position (store doesn't return scores)
            similarity: 1 - idx / candidates.length,
        }));
        const ranked = this.ranker.rank(withSimilarity, limit, (ep) => ep.utility ?? ep.importance, (ep) => ep.timestamp);
        return ranked.map((r) => r.item);
    }
    /** Retrieve episodes within a time range. */
    async getByTimeRange(start, end) {
        return this._store.getByTimeRange(start, end);
    }
    /** Retrieve episodes involving a specific actor. */
    async getByActor(actor) {
        return this._store.getByActor(actor);
    }
    /** Search episodes by keyword. */
    async searchByKeyword(keyword, limit = 10) {
        return this._store.searchByKeyword(keyword, limit);
    }
    /** Delete a single episode by ID. */
    async delete(id) {
        await this._store.delete(id);
    }
    /** Delete all episodes for an actor (used by forget-me). */
    async deleteByActor(actor) {
        await this._store.deleteByActor(actor);
    }
    /** Get total episode count. */
    async count() {
        return this._store.count();
    }
    /** Update utility score for an episode from outcome reward (ATLAS feedback loop). */
    async updateUtilityFromReward(id, reward) {
        const episode = await this._store.get(id);
        if (!episode)
            return;
        const currentUtility = episode.utility ?? episode.importance;
        const currentCount = episode.retrievalCount ?? 0;
        const newUtility = this.utilityTracker.updateUtility(currentUtility, reward);
        await this._store.updateUtility(id, newUtility, currentCount + 1);
    }
    /**
     * Estimate importance of an episode for memory retention.
     * Higher importance = more likely to be retained during pruning.
     */
    estimateImportance(episode) {
        let importance = 0.5;
        const ctx = episode.context;
        if (ctx["error"])
            importance += 0.2;
        if (ctx["new_tool_used"])
            importance += 0.15;
        if (ctx["positive_feedback"])
            importance += 0.15;
        return Math.min(importance, 1.0);
    }
    /** Convert an episode to a searchable text string. */
    episodeToText(episode) {
        return [
            ...episode.actions,
            episode.outcome ?? "",
            episode.summary ?? "",
        ].join(" ");
    }
}
//# sourceMappingURL=episodic-memory.js.map