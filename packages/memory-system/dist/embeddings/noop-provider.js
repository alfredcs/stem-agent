/**
 * No-op embedding provider that returns zero vectors.
 * Useful for tests and environments without an embedding API.
 */
export class NoOpEmbeddingProvider {
    dimensions;
    constructor(dimensions = 1536) {
        this.dimensions = dimensions;
    }
    async embed(_text) {
        return new Array(this.dimensions).fill(0);
    }
    async embedBatch(texts) {
        return texts.map(() => new Array(this.dimensions).fill(0));
    }
}
//# sourceMappingURL=noop-provider.js.map