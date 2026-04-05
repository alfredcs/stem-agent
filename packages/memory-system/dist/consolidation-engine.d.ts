/**
 * Consolidation Engine — ATLAS-style promote/merge/prune with hard capacity bounds.
 *
 * Three phases run in order:
 * 1. **Promote**: High-utility episodes → synthesize KnowledgeTriples
 * 2. **Merge**: Similar semantic triples → combine with weighted-average utility
 * 3. **Prune**: Remove stale low-utility entries, enforce capacity limits
 */
import type { IEpisodicStore, ISemanticStore } from "./types.js";
import type { IEmbeddingProvider } from "./embeddings/provider.js";
import { type Logger } from "@stem-agent/shared";
export interface ConsolidationConfig {
    /** Utility threshold above which episodes are promoted to semantic (default 0.3). */
    uPromote: number;
    /** Utility threshold below which entries are pruned (default -0.1). */
    uPrune: number;
    /** Max age in ms before stale entries become prune candidates (default 7 days). */
    tMaxAge: number;
    /** Cosine similarity threshold for merging semantic entries (default 0.85). */
    thetaMerge: number;
    /** Hard cap on episodic memory entries (default 1000). */
    episodicCapacity: number;
    /** Hard cap on semantic memory entries (default 500). */
    semanticCapacity: number;
    /** Minimum retrieval count before an entry can be pruned (default 5). */
    minMaturity: number;
}
export interface ConsolidationStats {
    promoted: number;
    merged: number;
    pruned: number;
}
export declare class ConsolidationEngine {
    private readonly episodicStore;
    private readonly semanticStore;
    private readonly embeddings;
    private readonly config;
    private readonly log;
    constructor(episodicStore: IEpisodicStore, semanticStore: ISemanticStore, embeddings: IEmbeddingProvider, config?: Partial<ConsolidationConfig>, logger?: Logger);
    /** Run all three consolidation phases in order. */
    consolidate(): Promise<ConsolidationStats>;
    /**
     * Phase 1: Promote — high-utility episodes → KnowledgeTriples.
     * Groups promotable episodes by embedding similarity, synthesizes one triple per cluster.
     */
    private promote;
    /**
     * Phase 2: Merge — combine similar semantic triples.
     * Pairwise cosine > thetaMerge → merge via weighted-average utility.
     */
    private merge;
    /**
     * Phase 3: Prune — remove stale low-utility entries, enforce capacity.
     * Eligible: utility < uPrune AND age > tMaxAge AND retrievalCount >= minMaturity.
     * Then enforce hard capacity by evicting lowest-utility entries.
     */
    private prune;
    /** Greedy clustering of items by embedding similarity. */
    private clusterByEmbedding;
    /** Element-wise average of embedding vectors. */
    private averageEmbeddings;
}
//# sourceMappingURL=consolidation-engine.d.ts.map