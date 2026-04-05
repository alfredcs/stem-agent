import type { Logger } from "@stem-agent/shared";
import type { IEpisodicStore, ISemanticStore, IProceduralStore } from "./types.js";
import type { ConsolidationEngine } from "./consolidation-engine.js";
/**
 * Background memory indexer for re-indexing, compression, and garbage collection.
 *
 * In production this would run on a timer. For simplicity the methods
 * are exposed for manual/test invocation and an optional interval-based loop.
 */
export declare class MemoryIndexer {
    private readonly episodicStore;
    private readonly semanticStore;
    private readonly proceduralStore;
    private readonly consolidationEngine;
    private readonly log;
    private timer;
    constructor(stores: {
        episodic: IEpisodicStore;
        semantic: ISemanticStore;
        procedural: IProceduralStore;
    }, logger?: Logger, consolidationEngine?: ConsolidationEngine);
    /**
     * Prune old, low-importance episodic memories.
     * Keeps the top `keepPercent`% by importance.
     */
    pruneEpisodic(keepPercent?: number): Promise<number>;
    /**
     * Remove duplicate semantic triples (same subject+predicate+object).
     * Keeps the one with the highest version.
     */
    deduplicateSemantic(): Promise<number>;
    /** Get a summary of current memory counts. */
    stats(): Promise<{
        episodic: number;
        semantic: number;
        procedural: number;
    }>;
    /** Start a periodic maintenance loop (interval in ms). */
    start(intervalMs?: number): void;
    /** Stop the periodic maintenance loop. */
    stop(): void;
    /**
     * Extract repeated patterns from episodic memory into semantic triples.
     * Groups episodes by actor+outcome; actions appearing ≥3 times become triples.
     */
    extractPatterns(): Promise<number>;
    /**
     * Extract successful action strategies from episodic memory into procedures.
     * Finds episodes with successful outcomes sharing identical action sequences.
     */
    extractStrategies(): Promise<number>;
    /** Run all maintenance tasks once. */
    runMaintenance(): Promise<void>;
}
//# sourceMappingURL=indexer.d.ts.map