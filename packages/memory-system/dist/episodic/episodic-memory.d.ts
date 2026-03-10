import type { Episode } from "@stem-agent/shared";
import type { IEpisodicStore } from "../types.js";
import type { IEmbeddingProvider } from "../embeddings/provider.js";
import type { Logger } from "@stem-agent/shared";
/**
 * Episodic memory — sequential records of past interactions/events.
 *
 * Supports retrieval by time range, vector similarity, keyword, and actor.
 * Automatically scores importance on storage.
 */
export declare class EpisodicMemory {
    private readonly _store;
    private readonly embeddings;
    private readonly log;
    constructor(store: IEpisodicStore, embeddings: IEmbeddingProvider, logger?: Logger);
    /** Store a new episode, computing its embedding and importance score. */
    store(episode: Episode): Promise<void>;
    /** Search episodes by semantic similarity to a query string. */
    search(query: string, limit?: number): Promise<Episode[]>;
    /** Retrieve episodes within a time range. */
    getByTimeRange(start: number, end: number): Promise<Episode[]>;
    /** Retrieve episodes involving a specific actor. */
    getByActor(actor: string): Promise<Episode[]>;
    /** Search episodes by keyword. */
    searchByKeyword(keyword: string, limit?: number): Promise<Episode[]>;
    /** Delete a single episode by ID. */
    delete(id: string): Promise<void>;
    /** Delete all episodes for an actor (used by forget-me). */
    deleteByActor(actor: string): Promise<void>;
    /** Get total episode count. */
    count(): Promise<number>;
    /**
     * Estimate importance of an episode for memory retention.
     * Higher importance = more likely to be retained during pruning.
     */
    estimateImportance(episode: Episode): number;
    /** Convert an episode to a searchable text string. */
    private episodeToText;
}
//# sourceMappingURL=episodic-memory.d.ts.map