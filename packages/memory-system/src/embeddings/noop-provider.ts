import type { IEmbeddingProvider } from "./provider.js";

/**
 * No-op embedding provider that returns zero vectors.
 * Useful for tests and environments without an embedding API.
 */
export class NoOpEmbeddingProvider implements IEmbeddingProvider {
  readonly dimensions: number;

  constructor(dimensions = 1536) {
    this.dimensions = dimensions;
  }

  async embed(_text: string): Promise<number[]> {
    return new Array(this.dimensions).fill(0) as number[];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => new Array(this.dimensions).fill(0) as number[]);
  }
}
