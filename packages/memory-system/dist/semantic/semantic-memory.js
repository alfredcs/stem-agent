import { createLogger } from "@stem-agent/shared";
/**
 * Semantic memory — long-term knowledge store with knowledge graph structure.
 *
 * Supports CRUD on knowledge triples, embedding-based similarity search,
 * conflict resolution with versioning, and import/export in JSON format.
 */
export class SemanticMemory {
    _store;
    embeddings;
    log;
    constructor(store, embeddings, logger) {
        this._store = store;
        this.embeddings = embeddings;
        this.log = logger ?? createLogger("semantic-memory");
    }
    /** Store or update a knowledge triple, computing its embedding. */
    async store(triple) {
        const text = `${triple.subject} ${triple.predicate} ${triple.object}`;
        const embedding = await this.embeddings.embed(text);
        await this._store.upsert({ ...triple, embedding });
        this.log.debug({ id: triple.id }, "knowledge triple stored");
    }
    /** Search knowledge by semantic similarity. */
    async search(query, limit = 10) {
        const embedding = await this.embeddings.embed(query);
        return this._store.searchByEmbedding(embedding, limit);
    }
    /** Search knowledge triples by subject. */
    async searchBySubject(subject) {
        return this._store.searchBySubject(subject);
    }
    /** Get a single triple by ID. */
    async get(id) {
        return this._store.get(id);
    }
    /** Update an existing triple (upsert with version bump handled by store). */
    async update(triple) {
        await this.store(triple);
    }
    /** Delete a knowledge triple. */
    async delete(id) {
        await this._store.delete(id);
        this.log.debug({ id }, "knowledge triple deleted");
    }
    /** Export all triples as JSON-serializable array. */
    async exportTriples() {
        return this._store.getAll();
    }
    /** Import triples from a JSON array (upserts each). */
    async importTriples(triples) {
        let count = 0;
        for (const triple of triples) {
            await this.store(triple);
            count++;
        }
        return count;
    }
    /** Get total triple count. */
    async count() {
        return this._store.count();
    }
}
//# sourceMappingURL=semantic-memory.js.map