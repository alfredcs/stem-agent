import type { KnowledgeTriple } from "@stem-agent/shared";
import type { ISemanticStore } from "../types.js";
/**
 * In-memory semantic store for knowledge triples.
 * Supports CRUD, vector similarity search, and subject lookup.
 */
export declare class InMemorySemanticStore implements ISemanticStore {
    private readonly triples;
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
//# sourceMappingURL=store.d.ts.map