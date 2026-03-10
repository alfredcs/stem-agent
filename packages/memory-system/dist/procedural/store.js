"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryProceduralStore = void 0;
const cosine_js_1 = require("../embeddings/cosine.js");
/**
 * In-memory procedural store for learned procedures/skills.
 */
class InMemoryProceduralStore {
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
            score: (0, cosine_js_1.cosineSimilarity)(embedding, p.embedding),
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
exports.InMemoryProceduralStore = InMemoryProceduralStore;
//# sourceMappingURL=store.js.map