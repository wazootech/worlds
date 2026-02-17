import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";

/**
 * UniversalSentenceEncoderEmbeddings generates vector embeddings using TensorFlow.js Universal Sentence Encoder.
 */
export class UniversalSentenceEncoderEmbeddings implements Embeddings {
  private model: use.UniversalSentenceEncoder | null = null;

  /**
   * dimensions is the dimensionality of the vector embeddings.
   * Universal Sentence Encoder generates 512-dimensional vectors.
   */
  public get dimensions(): number {
    return 512;
  }

  /**
   * load loads the TensorFlow model.
   */
  public async load(): Promise<void> {
    if (this.model) {
      return;
    }

    // Set TensorFlow.js backend to WASM for better server-side performance
    await tf.setBackend("wasm");
    await tf.ready();

    // Load the Universal Sentence Encoder model with retries to handle transient network issues
    let lastError: unknown;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.model = await use.load();
        return;
      } catch (error) {
        lastError = error;
        console.warn(
          `Failed to load Universal Sentence Encoder model (attempt ${attempt}/${maxAttempts}):`,
          error,
        );
        if (attempt < maxAttempts) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(
      `Failed to load Universal Sentence Encoder model after ${maxAttempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }


  /**
   * embed generates a vector embedding for a given text.
   */
  public async embed(text: string): Promise<number[]> {
    if (!this.model) {
      await this.load();
    }

    if (!this.model) {
      throw new Error("Failed to load Universal Sentence Encoder model");
    }

    const embeddings = await this.model.embed([text]);
    const embeddingArray = await embeddings.array();
    embeddings.dispose(); // Clean up tensor memory
    return embeddingArray[0];
  }
}
