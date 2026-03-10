import type { KnowledgeTriple } from "@stem-agent/shared";
import type { ISemanticStore } from "../types.js";
import { cosineSimilarity } from "../embeddings/cosine.js";

/**
 * In-memory semantic store for knowledge triples.
 * Supports CRUD, vector similarity search, and subject lookup.
 */
export class InMemorySemanticStore implements ISemanticStore {
  private readonly triples = new Map<string, KnowledgeTriple>();

  async upsert(triple: KnowledgeTriple): Promise<void> {
    const existing = this.triples.get(triple.id);
    if (existing) {
      this.triples.set(triple.id, {
        ...triple,
        version: existing.version + 1,
        updatedAt: Date.now(),
      });
    } else {
      this.triples.set(triple.id, triple);
    }
  }

  async get(id: string): Promise<KnowledgeTriple | null> {
    return this.triples.get(id) ?? null;
  }

  async searchByEmbedding(
    embedding: number[],
    limit: number,
  ): Promise<KnowledgeTriple[]> {
    return [...this.triples.values()]
      .filter((t) => t.embedding && t.embedding.length > 0)
      .map((t) => ({
        triple: t,
        score: cosineSimilarity(embedding, t.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.triple);
  }

  async searchBySubject(subject: string): Promise<KnowledgeTriple[]> {
    const lower = subject.toLowerCase();
    return [...this.triples.values()].filter((t) =>
      t.subject.toLowerCase().includes(lower),
    );
  }

  async delete(id: string): Promise<void> {
    this.triples.delete(id);
  }

  async getAll(): Promise<KnowledgeTriple[]> {
    return [...this.triples.values()];
  }

  async count(): Promise<number> {
    return this.triples.size;
  }
}
