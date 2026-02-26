import { embed } from "ai";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";

/**
 * OpenRouterEmbeddingsOptions are options for the OpenRouterEmbeddings.
 */
export interface OpenRouterEmbeddingsOptions {
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
 * OpenRouterEmbeddings generates vector embeddings using OpenRouter via Vercel AI SDK.
 */
export class OpenRouterEmbeddings implements Embeddings {
  public constructor(private readonly options: OpenRouterEmbeddingsOptions) {}

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
