import type { IEmbeddingProvider } from "./provider.js";
/**
 * No-op embedding provider that returns zero vectors.
 * Useful for tests and environments without an embedding API.
 */
export declare class NoOpEmbeddingProvider implements IEmbeddingProvider {
    readonly dimensions: number;
    constructor(dimensions?: number);
    embed(_text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
//# sourceMappingURL=noop-provider.d.ts.map