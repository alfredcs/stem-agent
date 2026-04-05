/**
 * Consolidation Engine — ATLAS-style promote/merge/prune with hard capacity bounds.
 *
 * Three phases run in order:
 * 1. **Promote**: High-utility episodes → synthesize KnowledgeTriples
 * 2. **Merge**: Similar semantic triples → combine with weighted-average utility
 * 3. **Prune**: Remove stale low-utility entries, enforce capacity limits
 */
import { cosineSimilarity } from "./embeddings/cosine.js";
import { createLogger } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";
const DEFAULT_CONFIG = {
    uPromote: 0.3,
    uPrune: -0.1,
    tMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    thetaMerge: 0.85,
    episodicCapacity: 1000,
    semanticCapacity: 500,
    minMaturity: 5,
};
export class ConsolidationEngine {
    episodicStore;
    semanticStore;
    embeddings;
    config;
    log;
    constructor(episodicStore, semanticStore, embeddings, config, logger) {
        this.episodicStore = episodicStore;
        this.semanticStore = semanticStore;
        this.embeddings = embeddings;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.log = logger ?? createLogger("consolidation-engine");
    }
    /** Run all three consolidation phases in order. */
    async consolidate() {
        const promoted = await this.promote();
        const merged = await this.merge();
        const pruned = await this.prune();
        this.log.info({ promoted, merged, pruned }, "consolidation complete");
        return { promoted, merged, pruned };
    }
    /**
     * Phase 1: Promote — high-utility episodes → KnowledgeTriples.
     * Groups promotable episodes by embedding similarity, synthesizes one triple per cluster.
     */
    async promote() {
        const episodes = await this.episodicStore.getAll();
        const promotable = episodes.filter((ep) => (ep.utility ?? ep.importance) > this.config.uPromote && ep.embedding);
        if (promotable.length === 0)
            return 0;
        // Simple greedy clustering by embedding similarity
        const clusters = this.clusterByEmbedding(promotable, this.config.thetaMerge);
        let promoted = 0;
        const now = Date.now();
        for (const cluster of clusters) {
            if (cluster.length === 0)
                continue;
            // Synthesize a triple from the cluster
            const representative = cluster[0];
            const actor = representative.actors[0] ?? "agent";
            const action = representative.actions[0] ?? "performed";
            const outcome = representative.outcome ?? "unknown";
            const meanUtility = cluster.reduce((s, ep) => s + (ep.utility ?? ep.importance), 0) / cluster.length;
            // Average embeddings for the merged triple
            const avgEmbedding = this.averageEmbeddings(cluster.map((ep) => ep.embedding));
            await this.semanticStore.upsert({
                id: randomUUID(),
                subject: actor,
                predicate: action,
                object: outcome,
                confidence: Math.min(meanUtility, 1),
                source: "consolidation_promote",
                embedding: avgEmbedding,
                createdAt: now,
                updatedAt: now,
                version: 1,
                utility: meanUtility,
                sourceCount: cluster.length,
                retrievalCount: 0,
            });
            promoted++;
        }
        this.log.debug({ promoted, clustersFormed: clusters.length }, "promote phase done");
        return promoted;
    }
    /**
     * Phase 2: Merge — combine similar semantic triples.
     * Pairwise cosine > thetaMerge → merge via weighted-average utility.
     */
    async merge() {
        const triples = await this.semanticStore.getAll();
        if (triples.length < 2)
            return 0;
        const withEmbeddings = triples.filter((t) => t.embedding && t.embedding.length > 0);
        const merged = new Set(); // IDs already consumed
        let mergeCount = 0;
        for (let i = 0; i < withEmbeddings.length; i++) {
            const a = withEmbeddings[i];
            if (merged.has(a.id))
                continue;
            const group = [a];
            for (let j = i + 1; j < withEmbeddings.length; j++) {
                const b = withEmbeddings[j];
                if (merged.has(b.id))
                    continue;
                const sim = cosineSimilarity(a.embedding, b.embedding);
                if (sim > this.config.thetaMerge) {
                    group.push(b);
                    merged.add(b.id);
                }
            }
            if (group.length > 1) {
                merged.add(a.id);
                // Weighted-average utility by sourceCount
                const totalSources = group.reduce((s, t) => s + (t.sourceCount ?? 1), 0);
                const weightedUtility = group.reduce((s, t) => s + (t.utility ?? t.confidence) * (t.sourceCount ?? 1), 0) / totalSources;
                const avgEmbedding = this.averageEmbeddings(group.map((t) => t.embedding));
                const now = Date.now();
                const mergedTriple = {
                    id: randomUUID(),
                    subject: group[0].subject,
                    predicate: group[0].predicate,
                    object: group[0].object,
                    confidence: Math.min(weightedUtility, 1),
                    source: "consolidation_merge",
                    embedding: avgEmbedding,
                    createdAt: Math.min(...group.map((t) => t.createdAt)),
                    updatedAt: now,
                    version: Math.max(...group.map((t) => t.version)) + 1,
                    utility: weightedUtility,
                    sourceCount: totalSources,
                    retrievalCount: group.reduce((s, t) => s + (t.retrievalCount ?? 0), 0),
                };
                await this.semanticStore.merge(group.map((t) => t.id), mergedTriple);
                mergeCount++;
            }
        }
        this.log.debug({ mergeCount }, "merge phase done");
        return mergeCount;
    }
    /**
     * Phase 3: Prune — remove stale low-utility entries, enforce capacity.
     * Eligible: utility < uPrune AND age > tMaxAge AND retrievalCount >= minMaturity.
     * Then enforce hard capacity by evicting lowest-utility entries.
     */
    async prune() {
        const now = Date.now();
        let pruned = 0;
        // Prune episodes
        const episodes = await this.episodicStore.getAll();
        for (const ep of episodes) {
            const utility = ep.utility ?? ep.importance;
            const age = now - ep.timestamp;
            const maturity = ep.retrievalCount ?? 0;
            if (utility < this.config.uPrune && age > this.config.tMaxAge && maturity >= this.config.minMaturity) {
                await this.episodicStore.delete(ep.id);
                pruned++;
            }
        }
        // Enforce episodic capacity
        const remainingEpisodes = await this.episodicStore.getAll();
        if (remainingEpisodes.length > this.config.episodicCapacity) {
            const sorted = [...remainingEpisodes].sort((a, b) => (a.utility ?? a.importance) - (b.utility ?? b.importance));
            const excess = sorted.slice(0, remainingEpisodes.length - this.config.episodicCapacity);
            for (const ep of excess) {
                await this.episodicStore.delete(ep.id);
                pruned++;
            }
        }
        // Prune semantic triples
        const triples = await this.semanticStore.getAll();
        for (const triple of triples) {
            const utility = triple.utility ?? triple.confidence;
            const age = now - triple.updatedAt;
            const maturity = triple.retrievalCount ?? 0;
            if (utility < this.config.uPrune && age > this.config.tMaxAge && maturity >= this.config.minMaturity) {
                await this.semanticStore.delete(triple.id);
                pruned++;
            }
        }
        // Enforce semantic capacity
        const remainingTriples = await this.semanticStore.getAll();
        if (remainingTriples.length > this.config.semanticCapacity) {
            const sorted = [...remainingTriples].sort((a, b) => (a.utility ?? a.confidence) - (b.utility ?? b.confidence));
            const excess = sorted.slice(0, remainingTriples.length - this.config.semanticCapacity);
            for (const triple of excess) {
                await this.semanticStore.delete(triple.id);
                pruned++;
            }
        }
        this.log.debug({ pruned }, "prune phase done");
        return pruned;
    }
    /** Greedy clustering of items by embedding similarity. */
    clusterByEmbedding(items, threshold) {
        const clusters = [];
        const assigned = new Set();
        for (let i = 0; i < items.length; i++) {
            if (assigned.has(i))
                continue;
            const cluster = [items[i]];
            assigned.add(i);
            for (let j = i + 1; j < items.length; j++) {
                if (assigned.has(j))
                    continue;
                const sim = cosineSimilarity(items[i].embedding, items[j].embedding);
                if (sim > threshold) {
                    cluster.push(items[j]);
                    assigned.add(j);
                }
            }
            clusters.push(cluster);
        }
        return clusters;
    }
    /** Element-wise average of embedding vectors. */
    averageEmbeddings(embeddings) {
        if (embeddings.length === 0)
            return [];
        const dim = embeddings[0].length;
        const avg = new Array(dim).fill(0);
        for (const emb of embeddings) {
            for (let i = 0; i < dim; i++) {
                avg[i] += emb[i];
            }
        }
        for (let i = 0; i < dim; i++) {
            avg[i] /= embeddings.length;
        }
        return avg;
    }
}
//# sourceMappingURL=consolidation-engine.js.map