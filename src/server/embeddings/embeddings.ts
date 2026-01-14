// TODO: Support batch generate embeddings. Update embeddings to embed multiple texts at once.

/**
 * Embeddings interface for generating vector embeddings.
 */
export interface Embeddings {
  /**
   * embed generates a vector embedding for a given text.
   */
  embed: (text: string) => Promise<number[]>;

  /**
   * dimensions is the dimensionality of the vector embeddings.
   */
  dimensions: number;
}
