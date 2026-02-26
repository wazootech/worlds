import { embed } from "ai";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";

/**
 * OllamaEmbeddingsOptions are options for the OllamaEmbeddings.
 */
export interface OllamaEmbeddingsOptions {
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
 * OllamaEmbeddings generates vector embeddings using Ollama via Vercel AI SDK.
 */
export class OllamaEmbeddings implements Embeddings {
  public constructor(private readonly options: OllamaEmbeddingsOptions) {}

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
