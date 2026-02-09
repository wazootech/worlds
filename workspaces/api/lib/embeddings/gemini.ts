import type { GoogleGenerativeAI } from "@google/generative-ai";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";

/**
 * GeminiEmbeddingsOptions are options for the GeminiEmbeddings.
 */
export interface GeminiEmbeddingsOptions {
  /**
   * client is the GoogleGenerativeAI client.
   */
  client: GoogleGenerativeAI;

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
    const model = this.options.client.getGenerativeModel({
      model: this.options.model,
    });
    const response = await model.embedContent({
      content: { role: "user", parts: [{ text }] },
      outputDimensionality: this.options.dimensions,
    } as unknown as {
      content: { role: string; parts: { text: string }[] };
      outputDimensionality: number;
    });
    if (!response.embedding?.values) {
      throw new Error("Failed to generate embedding");
    }

    return response.embedding.values;
  }
}
