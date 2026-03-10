/** Pluggable embedding provider interface. */
export interface IEmbeddingProvider {
    /** Generate an embedding vector for a single text. */
    embed(text: string): Promise<number[]>;
    /** Generate embedding vectors for multiple texts. */
    embedBatch(texts: string[]): Promise<number[][]>;
    /** Dimensionality of the embedding vectors produced. */
    readonly dimensions: number;
}
//# sourceMappingURL=provider.d.ts.map