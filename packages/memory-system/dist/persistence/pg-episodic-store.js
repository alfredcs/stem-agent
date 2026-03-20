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
        timestamp: Number(row.timestamp),
        actors: row.actors,
        actions: row.actions,
        context: row.context ?? {},
        outcome: row.outcome ?? undefined,
        embedding: parseVector(row.embedding),
        importance: row.importance,
        summary: row.summary ?? undefined,
    };
}
export class PgEpisodicStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async append(episode) {
        await this.pool.query(`INSERT INTO episodes (id, timestamp, actors, actions, context, outcome, embedding, importance, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            episode.id,
            episode.timestamp,
            episode.actors,
            episode.actions,
            JSON.stringify(episode.context),
            episode.outcome ?? null,
            episode.embedding ? formatVector(episode.embedding) : null,
            episode.importance,
            episode.summary ?? null,
        ]);
    }
    async getByTimeRange(start, end) {
        const { rows } = await this.pool.query("SELECT * FROM episodes WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp", [start, end]);
        return rows.map(mapRow);
    }
    async getByActor(actor) {
        const { rows } = await this.pool.query("SELECT * FROM episodes WHERE $1 = ANY(actors) ORDER BY timestamp", [actor]);
        return rows.map(mapRow);
    }
    async searchByEmbedding(embedding, limit) {
        const { rows } = await this.pool.query(`SELECT * FROM episodes WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector LIMIT $2`, [formatVector(embedding), limit]);
        return rows.map(mapRow);
    }
    async searchByKeyword(keyword, limit) {
        const { rows } = await this.pool.query(`SELECT * FROM episodes
       WHERE summary ILIKE '%' || $1 || '%' OR outcome ILIKE '%' || $1 || '%'
       LIMIT $2`, [keyword, limit]);
        return rows.map(mapRow);
    }
    async delete(id) {
        await this.pool.query("DELETE FROM episodes WHERE id = $1", [id]);
    }
    async deleteByActor(actor) {
        await this.pool.query("DELETE FROM episodes WHERE $1 = ANY(actors)", [
            actor,
        ]);
    }
    async count() {
        const { rows } = await this.pool.query("SELECT COUNT(*)::int AS cnt FROM episodes");
        return rows[0].cnt;
    }
    async getAll() {
        const { rows } = await this.pool.query("SELECT * FROM episodes ORDER BY timestamp DESC");
        return rows.map(mapRow);
    }
}
//# sourceMappingURL=pg-episodic-store.js.map