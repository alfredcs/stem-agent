import type pg from "pg";
import type { Procedure } from "@stem-agent/shared";
import type { IProceduralStore } from "../types.js";
export declare class PgProceduralStore implements IProceduralStore {
    private readonly pool;
    constructor(pool: pg.Pool);
    upsert(procedure: Procedure): Promise<void>;
    get(id: string): Promise<Procedure | null>;
    getByName(name: string): Promise<Procedure | null>;
    searchByEmbedding(embedding: number[], limit: number): Promise<Procedure[]>;
    searchByTags(tags: string[]): Promise<Procedure[]>;
    getAll(): Promise<Procedure[]>;
    delete(id: string): Promise<void>;
    count(): Promise<number>;
}
//# sourceMappingURL=pg-procedural-store.d.ts.map