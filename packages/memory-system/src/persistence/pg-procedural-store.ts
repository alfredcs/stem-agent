import type pg from "pg";
import type { Procedure } from "@stem-agent/shared";
import type { IProceduralStore } from "../types.js";

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

function mapRow(row: Record<string, unknown>): Procedure {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    steps: row.steps as string[],
    preconditions: row.preconditions as string[],
    postconditions: row.postconditions as string[],
    successRate: row.success_rate as number,
    executionCount: row.execution_count as number,
    lastUsed: row.last_used != null ? Number(row.last_used) : undefined,
    embedding: parseVector(row.embedding),
    tags: row.tags as string[],
  };
}

export class PgProceduralStore implements IProceduralStore {
  constructor(private readonly pool: pg.Pool) {}

  async upsert(procedure: Procedure): Promise<void> {
    await this.pool.query(
      `INSERT INTO procedures (id, name, description, steps, preconditions, postconditions, success_rate, execution_count, last_used, embedding, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         steps = EXCLUDED.steps,
         preconditions = EXCLUDED.preconditions,
         postconditions = EXCLUDED.postconditions,
         success_rate = EXCLUDED.success_rate,
         execution_count = EXCLUDED.execution_count,
         last_used = EXCLUDED.last_used,
         embedding = EXCLUDED.embedding,
         tags = EXCLUDED.tags`,
      [
        procedure.id,
        procedure.name,
        procedure.description,
        procedure.steps,
        procedure.preconditions,
        procedure.postconditions,
        procedure.successRate,
        procedure.executionCount,
        procedure.lastUsed ?? null,
        procedure.embedding ? formatVector(procedure.embedding) : null,
        procedure.tags,
      ],
    );
  }

  async get(id: string): Promise<Procedure | null> {
    const { rows } = await this.pool.query(
      "SELECT * FROM procedures WHERE id = $1",
      [id],
    );
    return rows.length > 0 ? mapRow(rows[0]) : null;
  }

  async getByName(name: string): Promise<Procedure | null> {
    const { rows } = await this.pool.query(
      "SELECT * FROM procedures WHERE name = $1",
      [name],
    );
    return rows.length > 0 ? mapRow(rows[0]) : null;
  }

  async searchByEmbedding(
    embedding: number[],
    limit: number,
  ): Promise<Procedure[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM procedures WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector LIMIT $2`,
      [formatVector(embedding), limit],
    );
    return rows.map(mapRow);
  }

  async searchByTags(tags: string[]): Promise<Procedure[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM procedures WHERE tags && $1::text[]",
      [tags],
    );
    return rows.map(mapRow);
  }

  async getAll(): Promise<Procedure[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM procedures ORDER BY name",
    );
    return rows.map(mapRow);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM procedures WHERE id = $1", [id]);
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query(
      "SELECT COUNT(*)::int AS cnt FROM procedures",
    );
    return rows[0].cnt;
  }
}
