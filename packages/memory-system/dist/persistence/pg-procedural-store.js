"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgProceduralStore = void 0;
function formatVector(embedding) {
    return `[${embedding.join(",")}]`;
}
function parseVector(val) {
    if (val == null)
        return undefined;
    if (typeof val === "string") {
        return val
            .slice(1, -1)
            .split(",")
            .map(Number);
    }
    return undefined;
}
function mapRow(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        steps: row.steps,
        preconditions: row.preconditions,
        postconditions: row.postconditions,
        successRate: row.success_rate,
        executionCount: row.execution_count,
        lastUsed: row.last_used != null ? Number(row.last_used) : undefined,
        embedding: parseVector(row.embedding),
        tags: row.tags,
    };
}
class PgProceduralStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async upsert(procedure) {
        await this.pool.query(`INSERT INTO procedures (id, name, description, steps, preconditions, postconditions, success_rate, execution_count, last_used, embedding, tags)
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
         tags = EXCLUDED.tags`, [
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
        ]);
    }
    async get(id) {
        const { rows } = await this.pool.query("SELECT * FROM procedures WHERE id = $1", [id]);
        return rows.length > 0 ? mapRow(rows[0]) : null;
    }
    async getByName(name) {
        const { rows } = await this.pool.query("SELECT * FROM procedures WHERE name = $1", [name]);
        return rows.length > 0 ? mapRow(rows[0]) : null;
    }
    async searchByEmbedding(embedding, limit) {
        const { rows } = await this.pool.query(`SELECT * FROM procedures WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector LIMIT $2`, [formatVector(embedding), limit]);
        return rows.map(mapRow);
    }
    async searchByTags(tags) {
        const { rows } = await this.pool.query("SELECT * FROM procedures WHERE tags && $1::text[]", [tags]);
        return rows.map(mapRow);
    }
    async getAll() {
        const { rows } = await this.pool.query("SELECT * FROM procedures ORDER BY name");
        return rows.map(mapRow);
    }
    async delete(id) {
        await this.pool.query("DELETE FROM procedures WHERE id = $1", [id]);
    }
    async count() {
        const { rows } = await this.pool.query("SELECT COUNT(*)::int AS cnt FROM procedures");
        return rows[0].cnt;
    }
}
exports.PgProceduralStore = PgProceduralStore;
//# sourceMappingURL=pg-procedural-store.js.map