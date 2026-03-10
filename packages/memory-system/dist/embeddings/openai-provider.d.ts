import type { IEmbeddingProvider } from "./provider.js";
/**
 * OpenAI embedding provider using the REST API directly (no SDK).
 */
export declare class OpenAIEmbeddingProvider implements IEmbeddingProvider {
    private readonly apiKey;
    private readonly model;
    readonly dimensions: number;
    constructor(opts: {
        apiKey: string;
        model?: string;
        dimensions?: number;
    });
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    private callApi;
}
//# sourceMappingURL=openai-provider.d.ts.map