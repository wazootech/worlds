import type { Client } from "@libsql/client";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Patch, PatchHandler } from "@fartlabs/search-store";
export type { Patch, PatchHandler };
import { skolemizeQuad } from "@fartlabs/search-store";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";
import { TriplesService } from "#/lib/database/tables/triples/service.ts";
import { ChunkRepository } from "#/lib/database/tables/chunks/service.ts";

/**
 * handlePatch handles RDF patches by upserting and deleting triples and chunks.
 */
export async function handlePatch(
  client: Client,
  embeddings: Embeddings,
  patches: Patch[],
) {
  const triplesService = new TriplesService(client);
  const chunksService = new ChunkRepository(client);

  try {
    for (const patch of patches) {
      if (patch.deletions) {
        for (const q of patch.deletions) {
          const skolemizedStr = await skolemizeQuad(q);
          const tripleId = await hash(skolemizedStr);

          await triplesService.delete(tripleId);
        }
      }

      if (patch.insertions) {
        for (const q of patch.insertions) {
          const skolemizedStr = await skolemizeQuad(q);
          const tripleId = await hash(skolemizedStr);

          // Use original values for columns, but deterministic ID
          const subject = q.subject.value;
          const predicate = q.predicate.value;
          const object = q.object.value;

          // Calculate embedding if object is a literal and has text
          let vector: number[] | null = null;
          if (q.object.termType === "Literal") {
            // For now, only embed string literals
            // TODO: filter by datatype (string, langString, etc.)
            if (object.length > 0) {
              try {
                vector = await embeddings.embed(object);
              } catch (error) {
                console.warn(
                  `Failed to generate embedding for object "${
                    object.slice(0, 50)
                  }...":`,
                  error,
                );
                // Continue without vector - triples will be stored but not searchable via semantic search
              }
            }
          }


          // Upsert triple
          await triplesService.upsert({
            id: tripleId,
            subject,
            predicate,
            object,
            vector: null, // Triples table doesn't store vector in this schema, only Chunks
          });

          // Create and upsert chunks
          if (vector) {
            // Split text using RecursiveCharacterTextSplitter
            const splitter = new RecursiveCharacterTextSplitter({
              chunkSize: 1000, // Default to reasonable size
              chunkOverlap: 200,
            });
            const chunks = await splitter.splitText(object);

            for (let i = 0; i < chunks.length; i++) {
              const chunkText = chunks[i];
              let chunkVector = vector; // Default to object vector if single chunk

              // If multiple chunks, re-embed each chunk
              if (chunks.length > 1) {
                try {
                  chunkVector = await embeddings.embed(chunkText);
                } catch (error) {
                  console.warn(
                    `Failed to generate embedding for chunk "${
                      chunkText.slice(0, 50)
                    }...":`,
                    error,
                  );
                  // Use the original vector if re-embedding fails, or continue without vector if original failed too
                }
              }


              const chunkId = await hash(
                `${tripleId}:chunk:${i}`,
              );
              await chunksService.upsert({
                id: chunkId,
                triple_id: tripleId,
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
  } catch (error) {
    console.error("Error in ingest:", error);
    throw error;
  }
}

async function hash(msg: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * BufferedPatchHandler buffers patches and only applies them when commit is called.
 */
export class BufferedPatchHandler implements PatchHandler {
  private patches: Patch[] = [];

  constructor(private readonly handler: PatchHandler) {}

  public patch(patches: Patch[]): Promise<void> {
    this.patches.push(...patches);
    return Promise.resolve();
  }

  public async commit(): Promise<void> {
    if (this.patches.length > 0) {
      await this.handler.patch(this.patches);
    }
  }
}
