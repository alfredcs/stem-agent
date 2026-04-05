import type pg from "pg";
import type { KnowledgeTriple } from "@stem-agent/shared";
import type { ISemanticStore } from "../types.js";
export declare class PgSemanticStore implements ISemanticStore {
    private readonly pool;
    constructor(pool: pg.Pool);
    upsert(triple: KnowledgeTriple): Promise<void>;
    get(id: string): Promise<KnowledgeTriple | null>;
    searchByEmbedding(embedding: number[], limit: number): Promise<KnowledgeTriple[]>;
    searchBySubject(subject: string): Promise<KnowledgeTriple[]>;
    delete(id: string): Promise<void>;
    getAll(): Promise<KnowledgeTriple[]>;
    count(): Promise<number>;
    updateUtility(id: string, utility: number, retrievalCount: number): Promise<void>;
    merge(ids: string[], merged: KnowledgeTriple): Promise<void>;
}
//# sourceMappingURL=pg-semantic-store.d.ts.map