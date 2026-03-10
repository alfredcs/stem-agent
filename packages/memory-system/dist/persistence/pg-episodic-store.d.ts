import type pg from "pg";
import type { Episode } from "@stem-agent/shared";
import type { IEpisodicStore } from "../types.js";
export declare class PgEpisodicStore implements IEpisodicStore {
    private readonly pool;
    constructor(pool: pg.Pool);
    append(episode: Episode): Promise<void>;
    getByTimeRange(start: number, end: number): Promise<Episode[]>;
    getByActor(actor: string): Promise<Episode[]>;
    searchByEmbedding(embedding: number[], limit: number): Promise<Episode[]>;
    searchByKeyword(keyword: string, limit: number): Promise<Episode[]>;
    delete(id: string): Promise<void>;
    deleteByActor(actor: string): Promise<void>;
    count(): Promise<number>;
    getAll(): Promise<Episode[]>;
}
//# sourceMappingURL=pg-episodic-store.d.ts.map