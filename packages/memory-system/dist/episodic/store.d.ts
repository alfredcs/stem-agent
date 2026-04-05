import type { Episode } from "@stem-agent/shared";
import type { IEpisodicStore } from "../types.js";
/**
 * In-memory append-only episodic store.
 * Production deployments should substitute a SQLite/pgvector-backed store.
 */
export declare class InMemoryEpisodicStore implements IEpisodicStore {
    private readonly episodes;
    append(episode: Episode): Promise<void>;
    get(id: string): Promise<Episode | null>;
    getByTimeRange(start: number, end: number): Promise<Episode[]>;
    getByActor(actor: string): Promise<Episode[]>;
    searchByEmbedding(embedding: number[], limit: number): Promise<Episode[]>;
    searchByKeyword(keyword: string, limit: number): Promise<Episode[]>;
    delete(id: string): Promise<void>;
    deleteByActor(actor: string): Promise<void>;
    count(): Promise<number>;
    getAll(): Promise<Episode[]>;
    updateUtility(id: string, utility: number, retrievalCount: number): Promise<void>;
}
//# sourceMappingURL=store.d.ts.map