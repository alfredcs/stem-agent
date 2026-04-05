import type { KnowledgeTriple } from "@stem-agent/shared";
import type { ISemanticStore } from "../types.js";
import type { IEmbeddingProvider } from "../embeddings/provider.js";
import type { Logger } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";
import { UtilityTracker } from "../utility-tracker.js";
import { RetrievalRanker } from "../retrieval-ranker.js";

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
  private readonly utilityTracker = new UtilityTracker();
  private readonly ranker = new RetrievalRanker();

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

  /** Search knowledge by semantic similarity, re-ranked by utility and recency. */
  async search(query: string, limit = 10): Promise<KnowledgeTriple[]> {
    const embedding = await this.embeddings.embed(query);
    const candidates = await this._store.searchByEmbedding(embedding, limit * 2);
    if (candidates.length === 0) return [];

    const withSimilarity = candidates.map((triple, idx) => ({
      item: triple,
      similarity: 1 - idx / candidates.length,
    }));

    const ranked = this.ranker.rank(
      withSimilarity,
      limit,
      (t) => t.utility ?? t.confidence,
      (t) => t.updatedAt,
    );

    return ranked.map((r) => r.item);
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

  /** Update utility score for a triple from outcome reward (ATLAS feedback loop). */
  async updateUtilityFromReward(id: string, reward: number): Promise<void> {
    const triple = await this._store.get(id);
    if (!triple) return;
    const currentUtility = triple.utility ?? triple.confidence;
    const currentCount = triple.retrievalCount ?? 0;
    const newUtility = this.utilityTracker.updateUtility(currentUtility, reward);
    await this._store.updateUtility(id, newUtility, currentCount + 1);
  }

  /** Get total triple count. */
  async count(): Promise<number> {
    return this._store.count();
  }
}
