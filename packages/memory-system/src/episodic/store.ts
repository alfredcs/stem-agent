import type { Episode } from "@stem-agent/shared";
import type { IEpisodicStore } from "../types.js";
import { cosineSimilarity } from "../embeddings/cosine.js";

/**
 * In-memory append-only episodic store.
 * Production deployments should substitute a SQLite/pgvector-backed store.
 */
export class InMemoryEpisodicStore implements IEpisodicStore {
  private readonly episodes: Episode[] = [];

  async append(episode: Episode): Promise<void> {
    this.episodes.push(episode);
  }

  async getByTimeRange(start: number, end: number): Promise<Episode[]> {
    return this.episodes.filter(
      (e) => e.timestamp >= start && e.timestamp <= end,
    );
  }

  async getByActor(actor: string): Promise<Episode[]> {
    return this.episodes.filter((e) => e.actors.includes(actor));
  }

  async searchByEmbedding(
    embedding: number[],
    limit: number,
  ): Promise<Episode[]> {
    return this.episodes
      .filter((e) => e.embedding && e.embedding.length > 0)
      .map((e) => ({ episode: e, score: cosineSimilarity(embedding, e.embedding!) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.episode);
  }

  async searchByKeyword(keyword: string, limit: number): Promise<Episode[]> {
    const lower = keyword.toLowerCase();
    return this.episodes
      .filter((e) => {
        const text = [
          ...e.actions,
          e.outcome ?? "",
          e.summary ?? "",
          JSON.stringify(e.context),
        ]
          .join(" ")
          .toLowerCase();
        return text.includes(lower);
      })
      .slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    const idx = this.episodes.findIndex((e) => e.id === id);
    if (idx !== -1) this.episodes.splice(idx, 1);
  }

  async deleteByActor(actor: string): Promise<void> {
    for (let i = this.episodes.length - 1; i >= 0; i--) {
      if (this.episodes[i]!.actors.includes(actor)) {
        this.episodes.splice(i, 1);
      }
    }
  }

  async count(): Promise<number> {
    return this.episodes.length;
  }

  async getAll(): Promise<Episode[]> {
    return [...this.episodes];
  }
}
