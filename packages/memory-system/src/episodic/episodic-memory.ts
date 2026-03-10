import type { Episode } from "@stem-agent/shared";
import type { IEpisodicStore } from "../types.js";
import type { IEmbeddingProvider } from "../embeddings/provider.js";
import type { Logger } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";

/**
 * Episodic memory — sequential records of past interactions/events.
 *
 * Supports retrieval by time range, vector similarity, keyword, and actor.
 * Automatically scores importance on storage.
 */
export class EpisodicMemory {
  private readonly _store: IEpisodicStore;
  private readonly embeddings: IEmbeddingProvider;
  private readonly log: Logger;

  constructor(store: IEpisodicStore, embeddings: IEmbeddingProvider, logger?: Logger) {
    this._store = store;
    this.embeddings = embeddings;
    this.log = logger ?? createLogger("episodic-memory");
  }

  /** Store a new episode, computing its embedding and importance score. */
  async store(episode: Episode): Promise<void> {
    const text = this.episodeToText(episode);
    const embedding = await this.embeddings.embed(text);
    const scored: Episode = {
      ...episode,
      embedding,
      importance: episode.importance ?? this.estimateImportance(episode),
    };
    await this._store.append(scored);
    this.log.debug({ id: episode.id }, "episode stored");
  }

  /** Search episodes by semantic similarity to a query string. */
  async search(query: string, limit = 10): Promise<Episode[]> {
    const embedding = await this.embeddings.embed(query);
    return this._store.searchByEmbedding(embedding, limit);
  }

  /** Retrieve episodes within a time range. */
  async getByTimeRange(start: number, end: number): Promise<Episode[]> {
    return this._store.getByTimeRange(start, end);
  }

  /** Retrieve episodes involving a specific actor. */
  async getByActor(actor: string): Promise<Episode[]> {
    return this._store.getByActor(actor);
  }

  /** Search episodes by keyword. */
  async searchByKeyword(keyword: string, limit = 10): Promise<Episode[]> {
    return this._store.searchByKeyword(keyword, limit);
  }

  /** Delete a single episode by ID. */
  async delete(id: string): Promise<void> {
    await this._store.delete(id);
  }

  /** Delete all episodes for an actor (used by forget-me). */
  async deleteByActor(actor: string): Promise<void> {
    await this._store.deleteByActor(actor);
  }

  /** Get total episode count. */
  async count(): Promise<number> {
    return this._store.count();
  }

  /**
   * Estimate importance of an episode for memory retention.
   * Higher importance = more likely to be retained during pruning.
   */
  estimateImportance(episode: Episode): number {
    let importance = 0.5;
    const ctx = episode.context as Record<string, unknown>;
    if (ctx["error"]) importance += 0.2;
    if (ctx["new_tool_used"]) importance += 0.15;
    if (ctx["positive_feedback"]) importance += 0.15;
    return Math.min(importance, 1.0);
  }

  /** Convert an episode to a searchable text string. */
  private episodeToText(episode: Episode): string {
    return [
      ...episode.actions,
      episode.outcome ?? "",
      episode.summary ?? "",
    ].join(" ");
  }
}
