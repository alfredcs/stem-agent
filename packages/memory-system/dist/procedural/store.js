import { cosineSimilarity } from "../embeddings/cosine.js";
/**
 * In-memory procedural store for learned procedures/skills.
 */
export class InMemoryProceduralStore {
    procedures = new Map();
    async upsert(procedure) {
        this.procedures.set(procedure.id, procedure);
    }
    async get(id) {
        return this.procedures.get(id) ?? null;
    }
    async getByName(name) {
        for (const p of this.procedures.values()) {
            if (p.name === name)
                return p;
        }
        return null;
    }
    async searchByEmbedding(embedding, limit) {
        return [...this.procedures.values()]
            .filter((p) => p.embedding && p.embedding.length > 0)
            .map((p) => ({
            procedure: p,
            score: cosineSimilarity(embedding, p.embedding),
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => r.procedure);
    }
    async searchByTags(tags) {
        return [...this.procedures.values()].filter((p) => tags.some((tag) => p.tags.includes(tag)));
    }
    async getAll() {
        return [...this.procedures.values()];
    }
    async delete(id) {
        this.procedures.delete(id);
    }
    async count() {
        return this.procedures.size;
    }
}
//# sourceMappingURL=store.js.map