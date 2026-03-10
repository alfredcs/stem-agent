import type { KnowledgeTriple } from "@stem-agent/shared";
import type { ISemanticStore } from "../types.js";
import type { IEmbeddingProvider } from "../embeddings/provider.js";
import type { Logger } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";

/**
 * Semantic memory — long-term knowledge store with knowledge graph structure.
 *
 * Supports CRUD on knowledge triples, embedding-based similarity search,
 * conflict resolution with versioning, and import/export in JSON format.
 */
export class SemanticMemory {
  private readonly _store: ISemanticStore;
  private readonly embeddings: IEmbeddingProvider;
  private readonly log: Logger;

  constructor(store: ISemanticStore, embeddings: IEmbeddingProvider, logger?: Logger) {
    this._store = store;
    this.embeddings = embeddings;
    this.log = logger ?? createLogger("semantic-memory");
  }

  /** Store or update a knowledge triple, computing its embedding. */
  async store(triple: KnowledgeTriple): Promise<void> {
    const text = `${triple.subject} ${triple.predicate} ${triple.object}`;
    const embedding = await this.embeddings.embed(text);
    await this._store.upsert({ ...triple, embedding });
    this.log.debug({ id: triple.id }, "knowledge triple stored");
  }

  /** Search knowledge by semantic similarity. */
  async search(query: string, limit = 10): Promise<KnowledgeTriple[]> {
    const embedding = await this.embeddings.embed(query);
    return this._store.searchByEmbedding(embedding, limit);
  }

  /** Search knowledge triples by subject. */
  async searchBySubject(subject: string): Promise<KnowledgeTriple[]> {
    return this._store.searchBySubject(subject);
  }

  /** Get a single triple by ID. */
  async get(id: string): Promise<KnowledgeTriple | null> {
    return this._store.get(id);
  }

  /** Update an existing triple (upsert with version bump handled by store). */
  async update(triple: KnowledgeTriple): Promise<void> {
    await this.store(triple);
  }

  /** Delete a knowledge triple. */
  async delete(id: string): Promise<void> {
    await this._store.delete(id);
    this.log.debug({ id }, "knowledge triple deleted");
  }

  /** Export all triples as JSON-serializable array. */
  async exportTriples(): Promise<KnowledgeTriple[]> {
    return this._store.getAll();
  }

  /** Import triples from a JSON array (upserts each). */
  async importTriples(triples: KnowledgeTriple[]): Promise<number> {
    let count = 0;
    for (const triple of triples) {
      await this.store(triple);
      count++;
    }
    return count;
  }

  /** Get total triple count. */
  async count(): Promise<number> {
    return this._store.count();
  }
}
