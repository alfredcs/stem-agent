import type pg from "pg";
import type { KnowledgeTriple } from "@stem-agent/shared";
import type { ISemanticStore } from "../types.js";

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

function mapRow(row: Record<string, unknown>): KnowledgeTriple {
  return {
    id: row.id as string,
    subject: row.subject as string,
    predicate: row.predicate as string,
    object: row.object as string,
    confidence: row.confidence as number,
    source: (row.source as string) ?? undefined,
    embedding: parseVector(row.embedding),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    version: row.version as number,
    utility: row.utility != null ? (row.utility as number) : undefined,
    sourceCount: (row.source_count as number) ?? 1,
    retrievalCount: (row.retrieval_count as number) ?? 0,
    lastRetrieved: row.last_retrieved != null ? Number(row.last_retrieved) : undefined,
  };
}

export class PgSemanticStore implements ISemanticStore {
  constructor(private readonly pool: pg.Pool) {}

  async upsert(triple: KnowledgeTriple): Promise<void> {
    await this.pool.query(
      `INSERT INTO knowledge_triples (id, subject, predicate, object, confidence, source, embedding, created_at, updated_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         subject = EXCLUDED.subject,
         predicate = EXCLUDED.predicate,
         object = EXCLUDED.object,
         confidence = EXCLUDED.confidence,
         source = EXCLUDED.source,
         embedding = EXCLUDED.embedding,
         updated_at = EXCLUDED.updated_at,
         version = knowledge_triples.version + 1`,
      [
        triple.id,
        triple.subject,
        triple.predicate,
        triple.object,
        triple.confidence,
        triple.source ?? null,
        triple.embedding ? formatVector(triple.embedding) : null,
        triple.createdAt,
        triple.updatedAt,
        triple.version,
      ],
    );
  }

  async get(id: string): Promise<KnowledgeTriple | null> {
    const { rows } = await this.pool.query(
      "SELECT * FROM knowledge_triples WHERE id = $1",
      [id],
    );
    return rows.length > 0 ? mapRow(rows[0]) : null;
  }

  async searchByEmbedding(
    embedding: number[],
    limit: number,
  ): Promise<KnowledgeTriple[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM knowledge_triples WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector LIMIT $2`,
      [formatVector(embedding), limit],
    );
    return rows.map(mapRow);
  }

  async searchBySubject(subject: string): Promise<KnowledgeTriple[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM knowledge_triples WHERE subject ILIKE '%' || $1 || '%'",
      [subject],
    );
    return rows.map(mapRow);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM knowledge_triples WHERE id = $1", [id]);
  }

  async getAll(): Promise<KnowledgeTriple[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM knowledge_triples ORDER BY updated_at DESC",
    );
    return rows.map(mapRow);
  }

  async count(): Promise<number> {
    const { rows } = await this.pool.query(
      "SELECT COUNT(*)::int AS cnt FROM knowledge_triples",
    );
    return rows[0].cnt;
  }

  async updateUtility(id: string, utility: number, retrievalCount: number): Promise<void> {
    await this.pool.query(
      "UPDATE knowledge_triples SET utility = $1, retrieval_count = $2, last_retrieved = $3, updated_at = $4 WHERE id = $5",
      [utility, retrievalCount, Date.now(), Date.now(), id],
    );
  }

  async merge(ids: string[], merged: KnowledgeTriple): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM knowledge_triples WHERE id = ANY($1::uuid[])",
        [ids],
      );
      await client.query(
        `INSERT INTO knowledge_triples (id, subject, predicate, object, confidence, source, embedding, created_at, updated_at, version, utility, source_count, retrieval_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          merged.id, merged.subject, merged.predicate, merged.object, merged.confidence,
          merged.source ?? null, merged.embedding ? formatVector(merged.embedding) : null,
          merged.createdAt, merged.updatedAt, merged.version,
          merged.utility ?? null, merged.sourceCount ?? 1, merged.retrievalCount ?? 0,
        ],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
