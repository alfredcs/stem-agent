import type pg from "pg";
import type { Episode } from "@stem-agent/shared";
import type { IEpisodicStore } from "../types.js";

function formatVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function parseVector(val: unknown): number[] | undefined {
  if (val == null) return undefined;
  if (typeof val === "string") {
    return val
      .slice(1, -1)
      .split(",")
      .map(Number);
  }
  return undefined;
}

function mapRow(row: Record<string, unknown>): Episode {
  return {
    id: row.id as string,
    timestamp: Number(row.timestamp),
    actors: row.actors as string[],
    actions: row.actions as string[],
    context: (row.context as Record<string, unknown>) ?? {},
    outcome: (row.outcome as string) ?? undefined,
    embedding: parseVector(row.embedding),
    importance: row.importance as number,
    summary: (row.summary as string) ?? undefined,
    utility: row.utility != null ? (row.utility as number) : undefined,
    retrievalCount: (row.retrieval_count as number) ?? 0,
    lastRetrieved: row.last_retrieved != null ? Number(row.last_retrieved) : undefined,
  };
}

export class PgEpisodicStore implements IEpisodicStore {
  constructor(private readonly pool: pg.Pool) {}

  async append(episode: Episode): Promise<void> {
    await this.pool.query(
      `INSERT INTO episodes (id, timestamp, actors, actions, context, outcome, embedding, importance, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        episode.id,
        episode.timestamp,
        episode.actors,
        episode.actions,
        JSON.stringify(episode.context),
        episode.outcome ?? null,
        episode.embedding ? formatVector(episode.embedding) : null,
        episode.importance,
        episode.summary ?? null,
      ],
    );
  }

  async get(id: string): Promise<Episode | null> {
    const { rows } = await this.pool.query("SELECT * FROM episodes WHERE id = $1", [id]);
    return rows.length > 0 ? mapRow(rows[0]) : null;
  }

  async getByTimeRange(start: number, end: number): Promise<Episode[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM episodes WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp",
      [start, end],
    );
    return rows.map(mapRow);
  }

  async getByActor(actor: string): Promise<Episode[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM episodes WHERE $1 = ANY(actors) ORDER BY timestamp",
      [actor],
    );
    return rows.map(mapRow);
  }

  async searchByEmbedding(
    embedding: number[],
    limit: number,
  ): Promise<Episode[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM episodes WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector LIMIT $2`,
      [formatVector(embedding), limit],
    );
    return rows.map(mapRow);
  }

  async searchByKeyword(keyword: string, limit: number): Promise<Episode[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM episodes
       WHERE summary ILIKE '%' || $1 || '%' OR outcome ILIKE '%' || $1 || '%'
       LIMIT $2`,
      [keyword, limit],
    );
    return rows.map(mapRow);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM episodes WHERE id = $1", [id]);
  }

  async deleteByActor(actor: string): Promise<void> {
    await this.pool.query("DELETE FROM episodes WHERE $1 = ANY(actors)", [
      actor,
    ]);
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query("SELECT COUNT(*)::int AS cnt FROM episodes");
    return rows[0].cnt;
  }

  async updateUtility(id: string, utility: number, retrievalCount: number): Promise<void> {
    await this.pool.query(
      "UPDATE episodes SET utility = $1, retrieval_count = $2, last_retrieved = $3 WHERE id = $4",
      [utility, retrievalCount, Date.now(), id],
    );
  }

  async getAll(): Promise<Episode[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM episodes ORDER BY timestamp DESC",
    );
    return rows.map(mapRow);
  }
}
