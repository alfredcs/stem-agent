import type { Procedure } from "@stem-agent/shared";
import type { IProceduralStore } from "../types.js";
import { cosineSimilarity } from "../embeddings/cosine.js";

/**
 * In-memory procedural store for learned procedures/skills.
 */
export class InMemoryProceduralStore implements IProceduralStore {
  private readonly procedures = new Map<string, Procedure>();

  async upsert(procedure: Procedure): Promise<void> {
    this.procedures.set(procedure.id, procedure);
  }

  async get(id: string): Promise<Procedure | null> {
    return this.procedures.get(id) ?? null;
  }

  async getByName(name: string): Promise<Procedure | null> {
    for (const p of this.procedures.values()) {
      if (p.name === name) return p;
    }
    return null;
  }

  async searchByEmbedding(
    embedding: number[],
    limit: number,
  ): Promise<Procedure[]> {
    return [...this.procedures.values()]
      .filter((p) => p.embedding && p.embedding.length > 0)
      .map((p) => ({
        procedure: p,
        score: cosineSimilarity(embedding, p.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.procedure);
  }

  async searchByTags(tags: string[]): Promise<Procedure[]> {
    return [...this.procedures.values()].filter((p) =>
      tags.some((tag) => p.tags.includes(tag)),
    );
  }

  async getAll(): Promise<Procedure[]> {
    return [...this.procedures.values()];
  }

  async delete(id: string): Promise<void> {
    this.procedures.delete(id);
  }

  async count(): Promise<number> {
    return this.procedures.size;
  }
}
