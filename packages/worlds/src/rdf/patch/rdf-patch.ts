import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Patch, PatchHandler } from "./types.ts";
import { skolemizeQuad } from "./skolem.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import { ChunksRepository } from "#/worlds/chunks/repository.ts";

export const META_PREDICATES = [
  "http://www.w3.org/2000/01/rdf-schema#label",
  "http://www.w3.org/2000/01/rdf-schema#comment",
];

function isMetaPredicate(p: string): boolean {
  return META_PREDICATES.includes(p);
}

/**
 * SearchIndexHandler handles RDF patches by updating the vector search index.
 * It uses a RecursiveCharacterTextSplitter to chunk literal values and generates
 * embeddings for each chunk.
 */
export class SearchIndexHandler implements PatchHandler {
  constructor(
    private readonly worldId: string,
    private readonly embeddings: Embeddings,
    private readonly namespace?: string,
  ) {}

  public async patch(patches: Patch[]): Promise<void> {
    const chunksRepository = new ChunksRepository(this.worldId, this.namespace);

    for (const patch of patches) {
      if (patch.deletions) {
        for (const q of patch.deletions) {
          const factId = await skolemizeQuad(q);
          await chunksRepository.deleteByFactId(factId);
        }
      }

      if (patch.insertions) {
        for (const q of patch.insertions) {
          const predicateValue = q.predicate.value;
          const isType = predicateValue ===
              "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" ||
            predicateValue === "a";

          const isFtsEligible = (q.object.termType === "Literal" || isType) &&
            (q.object.value.length > 0);

          if (!isFtsEligible) continue;
          if (isMetaPredicate(predicateValue)) continue;

          const tripleId = await skolemizeQuad(q);
          const subject = q.subject.value;
          const predicate = q.predicate.value;
          const object = q.object.value;

          try {
            const vector = await this.embeddings.embed(object);
            const splitter = new RecursiveCharacterTextSplitter({
              chunkSize: 1000,
              chunkOverlap: 200,
            });
            const chunks = await splitter.splitText(object);

            for (let i = 0; i < chunks.length; i++) {
              const chunkText = chunks[i];
              let chunkVector = vector;

              if (chunks.length > 1) {
                try {
                  chunkVector = await this.embeddings.embed(chunkText);
                } catch {
                  // Fallback to full object vector if sub-chunk embedding fails
                }
              }

              const chunkId = await hash(`${tripleId}:chunk:${i}`);
              await chunksRepository.upsert({
                id: chunkId,
                fact_id: tripleId,
                subject,
                predicate,
                text: chunkText,
                vector: new Uint8Array(new Float32Array(chunkVector).buffer),
              });
            }
          } catch (error) {
            console.error(`Failed to index quad ${tripleId}:`, error);
          }
        }
      }
    }
  }
}

async function hash(msg: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
