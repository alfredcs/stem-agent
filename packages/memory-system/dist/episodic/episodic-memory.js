import { createLogger } from "@stem-agent/shared";
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
    /** Search episodes by semantic similarity to a query string. */
    async search(query, limit = 10) {
        const embedding = await this.embeddings.embed(query);
        return this._store.searchByEmbedding(embedding, limit);
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