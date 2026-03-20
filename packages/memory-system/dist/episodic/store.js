import { cosineSimilarity } from "../embeddings/cosine.js";
/**
 * In-memory append-only episodic store.
 * Production deployments should substitute a SQLite/pgvector-backed store.
 */
export class InMemoryEpisodicStore {
    episodes = [];
    async append(episode) {
        this.episodes.push(episode);
    }
    async getByTimeRange(start, end) {
        return this.episodes.filter((e) => e.timestamp >= start && e.timestamp <= end);
    }
    async getByActor(actor) {
        return this.episodes.filter((e) => e.actors.includes(actor));
    }
    async searchByEmbedding(embedding, limit) {
        return this.episodes
            .filter((e) => e.embedding && e.embedding.length > 0)
            .map((e) => ({ episode: e, score: cosineSimilarity(embedding, e.embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => r.episode);
    }
    async searchByKeyword(keyword, limit) {
        const lower = keyword.toLowerCase();
        return this.episodes
            .filter((e) => {
            const text = [
                ...e.actions,
                e.outcome ?? "",
                e.summary ?? "",
                JSON.stringify(e.context),
            ]
                .join(" ")
                .toLowerCase();
            return text.includes(lower);
        })
            .slice(0, limit);
    }
    async delete(id) {
        const idx = this.episodes.findIndex((e) => e.id === id);
        if (idx !== -1)
            this.episodes.splice(idx, 1);
    }
    async deleteByActor(actor) {
        for (let i = this.episodes.length - 1; i >= 0; i--) {
            if (this.episodes[i].actors.includes(actor)) {
                this.episodes.splice(i, 1);
            }
        }
    }
    async count() {
        return this.episodes.length;
    }
    async getAll() {
        return [...this.episodes];
    }
}
//# sourceMappingURL=store.js.map