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

    // Load the Universal Sentence Encoder model from local files
    const modelUrl = import.meta.resolve("../../models/use/model.json");
    const vocabUrl = import.meta.resolve("../../models/use/vocab.json");

    try {
      this.model = await use.load({
        modelUrl,
        vocabUrl,
      });
    } catch (error) {
      throw new Error(
        `Failed to load local Universal Sentence Encoder model: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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
