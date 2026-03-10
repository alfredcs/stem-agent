"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpEmbeddingProvider = void 0;
/**
 * No-op embedding provider that returns zero vectors.
 * Useful for tests and environments without an embedding API.
 */
class NoOpEmbeddingProvider {
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
exports.NoOpEmbeddingProvider = NoOpEmbeddingProvider;
//# sourceMappingURL=noop-provider.js.map