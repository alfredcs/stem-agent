import type { KnowledgeTriple } from "@stem-agent/shared";
import type { ISemanticStore } from "../types.js";
import type { IEmbeddingProvider } from "../embeddings/provider.js";
import type { Logger } from "@stem-agent/shared";
/**
 * Semantic memory — long-term knowledge store with knowledge graph structure.
 *
 * Supports CRUD on knowledge triples, embedding-based similarity search,
 * conflict resolution with versioning, and import/export in JSON format.
 */
export declare class SemanticMemory {
    private readonly _store;
    private readonly embeddings;
    private readonly log;
    constructor(store: ISemanticStore, embeddings: IEmbeddingProvider, logger?: Logger);
    /** Store or update a knowledge triple, computing its embedding. */
    store(triple: KnowledgeTriple): Promise<void>;
    /** Search knowledge by semantic similarity. */
    search(query: string, limit?: number): Promise<KnowledgeTriple[]>;
    /** Search knowledge triples by subject. */
    searchBySubject(subject: string): Promise<KnowledgeTriple[]>;
    /** Get a single triple by ID. */
    get(id: string): Promise<KnowledgeTriple | null>;
    /** Update an existing triple (upsert with version bump handled by store). */
    update(triple: KnowledgeTriple): Promise<void>;
    /** Delete a knowledge triple. */
    delete(id: string): Promise<void>;
    /** Export all triples as JSON-serializable array. */
    exportTriples(): Promise<KnowledgeTriple[]>;
    /** Import triples from a JSON array (upserts each). */
    importTriples(triples: KnowledgeTriple[]): Promise<number>;
    /** Get total triple count. */
    count(): Promise<number>;
}
//# sourceMappingURL=semantic-memory.d.ts.map