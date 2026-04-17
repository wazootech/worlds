import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Patch } from "./types.ts";
import { skolemizeQuad } from "./skolem.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type { WorldsStorage } from "#/storage.ts";
import { FactsRepository } from "#/worlds/facts/repository.ts";
import { ChunksRepository } from "#/worlds/chunks/repository.ts";

const DEFAULT_GRAPH = "https://wazoo.dev/worlds/graphs/default";

/**
 * handlePatch handles RDF patches by upserting and deleting triples and chunks.
 * @param storage The worlds storage (N3 Store).
 * @param worldId The world identifier.
 * @param embeddings The embeddings strategy.
 * @param patches The patches to apply.
 */
export async function handlePatch(
  storage: WorldsStorage,
  worldId: string,
  embeddings: Embeddings,
  patches: Patch[],
) {
  const factsRepository = new FactsRepository(storage);
  const chunksRepository = new ChunksRepository(worldId);

  try {
    for (const patch of patches) {
      if (patch.deletions) {
        for (const q of patch.deletions) {
          const tripleId = await skolemizeQuad(q);
          await factsRepository.delete(tripleId);
        }
      }

      if (patch.insertions) {
        for (const q of patch.insertions) {
          const quadId = await skolemizeQuad(q);
          const isFtsEligible = (q.object.termType === "Literal") &&
            (q.object.value.length > 0);

          const tripleId = quadId;

          const subject = q.subject.value;
          const predicate = q.predicate.value;
          const object = q.object.value;
          const graph = q.graph.termType === "DefaultGraph"
            ? DEFAULT_GRAPH
            : q.graph.value;

          let vector: number[] | null = null;
          if (isFtsEligible) {
            try {
              vector = await embeddings.embed(object);
            } catch (_error) {
            }
          }

          await factsRepository.upsert({
            id: tripleId,
            subject,
            predicate,
            object,
            graph,
          });

          if (vector) {
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
                  chunkVector = await embeddings.embed(chunkText);
                } catch (_error) {
                }
              }

              const chunkId = await hash(
                `${tripleId}:chunk:${i}`,
              );
              await chunksRepository.upsert({
                id: chunkId,
                fact_id: tripleId,
                subject,
                predicate,
                text: chunkText,
                vector: new Uint8Array(new Float32Array(chunkVector).buffer),
              });
            }
          }
        }
      }
    }
  } catch (_error) {
    throw _error;
  }
}

async function hash(msg: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
