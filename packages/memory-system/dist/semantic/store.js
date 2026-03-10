"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySemanticStore = void 0;
const cosine_js_1 = require("../embeddings/cosine.js");
/**
 * In-memory semantic store for knowledge triples.
 * Supports CRUD, vector similarity search, and subject lookup.
 */
class InMemorySemanticStore {
    triples = new Map();
    async upsert(triple) {
        const existing = this.triples.get(triple.id);
        if (existing) {
            this.triples.set(triple.id, {
                ...triple,
                version: existing.version + 1,
                updatedAt: Date.now(),
            });
        }
        else {
            this.triples.set(triple.id, triple);
        }
    }
    async get(id) {
        return this.triples.get(id) ?? null;
    }
    async searchByEmbedding(embedding, limit) {
        return [...this.triples.values()]
            .filter((t) => t.embedding && t.embedding.length > 0)
            .map((t) => ({
            triple: t,
            score: (0, cosine_js_1.cosineSimilarity)(embedding, t.embedding),
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => r.triple);
    }
    async searchBySubject(subject) {
        const lower = subject.toLowerCase();
        return [...this.triples.values()].filter((t) => t.subject.toLowerCase().includes(lower));
    }
    async delete(id) {
        this.triples.delete(id);
    }
    async getAll() {
        return [...this.triples.values()];
    }
    async count() {
        return this.triples.size;
    }
}
exports.InMemorySemanticStore = InMemorySemanticStore;
//# sourceMappingURL=store.js.map