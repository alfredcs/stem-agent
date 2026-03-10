import type { IEmbeddingProvider } from "./provider.js";

/**
 * OpenAI embedding provider using the REST API directly (no SDK).
 */
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private readonly apiKey: string;
  private readonly model: string;
  readonly dimensions: number;

  constructor(opts: { apiKey: string; model?: string; dimensions?: number }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? "text-embedding-3-small";
    this.dimensions = opts.dimensions ?? 1536;
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.callApi(text);
    return result.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const result = await this.callApi(texts);
    return result.data
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((d: { embedding: number[] }) => d.embedding);
  }

  private async callApi(input: string | string[]): Promise<{
    data: Array<{ embedding: number[]; index: number }>;
  }> {
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

    return response.json() as Promise<{ data: Array<{ embedding: number[]; index: number }> }>;
  }
}
