/**
 * OpenAI embedding provider using the REST API directly (no SDK).
 */
export class OpenAIEmbeddingProvider {
    apiKey;
    model;
    dimensions;
    constructor(opts) {
        this.apiKey = opts.apiKey;
        this.model = opts.model ?? "text-embedding-3-small";
        this.dimensions = opts.dimensions ?? 1536;
    }
    async embed(text) {
        const result = await this.callApi(text);
        return result.data[0].embedding;
    }
    async embedBatch(texts) {
        const result = await this.callApi(texts);
        return result.data
            .sort((a, b) => a.index - b.index)
            .map((d) => d.embedding);
    }
    async callApi(input) {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                input,
                dimensions: this.dimensions,
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`OpenAI embeddings API error (${response.status}): ${body}`);
        }
        return response.json();
    }
}
//# sourceMappingURL=openai-provider.js.map