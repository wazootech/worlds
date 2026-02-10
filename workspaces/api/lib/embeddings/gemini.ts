import type { GoogleGenAI } from "@google/genai";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";

/**
 * GeminiEmbeddingsOptions are options for the GeminiEmbeddings.
 */
export interface GeminiEmbeddingsOptions {
  /**
   * client is the GoogleGenAI client.
   */
  client: GoogleGenAI;

  /**
   * model is the model to use for embedding.
   */
  model: string;

  /**
   * dimensions is the dimensionality of the vector embeddings.
   */
  dimensions: number;
}

/**
 * GeminiEmbeddings generates vector embeddings using Google GenAI.
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
    const response = await this.options.client.models.embedContent({
      model: this.options.model,
      contents: [text],
      config: { outputDimensionality: this.options.dimensions },
    });

    const embedding = response.embeddings?.[0];
    if (!embedding?.values) {
      throw new Error("Failed to generate embedding");
    }

    return embedding.values;
  }
}
