import { embed } from "ai";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";

/**
 * GeminiEmbeddingsOptions are options for the GeminiEmbeddings.
 */
export interface GeminiEmbeddingsOptions {
  /**
   * model is the model to use for embedding.
   */
  // deno-lint-ignore no-explicit-any
  model: any;

  /**
   * dimensions is the dimensionality of the vector embeddings.
   */
  dimensions: number;
}

/**
 * GeminiEmbeddings generates vector embeddings using Vercel AI SDK with Google provider.
 */
export class GeminiEmbeddings implements Embeddings {
  public constructor(private readonly options: GeminiEmbeddingsOptions) {}

  /**
   * dimensions is the dimensionality of the vector embeddings.
   */
  public get dimensions(): number {
    return this.options.dimensions;
  }

  /**
   * embed generates a vector embedding for a given text.
   */
  public async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.options.model,
      value: text,
    });

    return embedding;
  }
}
