import { WORLDS, WORLDS_WORLD_SLUG } from "#/core/ontology.ts";
import type { WorldsInterface } from "#/core/types.ts";
import type { WorldsPlugin } from "../interface.ts";

/**
 * ChunksPlugin makes chunk entities queryable via SPARQL.
 * This is an opt-in plugin that injects chunk triples into the WORLDS world.
 * 
 * Usage:
 * ```typescript
 * const chunksPlugin = new ChunksPlugin();
 * await composePlugins(chunksPlugin).initialize(worlds);
 * ```
 */
export class ChunksPlugin implements WorldsPlugin {
  name = "chunks";

  /**
   * initialize injects the chunk ontology into the WORLDS world.
   * This adds the Chunk class and its properties to the ontology.
   */
  async initialize(worlds: WorldsInterface): Promise<void> {
    await worlds.sparql({
      slug: WORLDS_WORLD_SLUG,
      query: `
        PREFIX worlds: <${WORLDS.NAMESPACE}>
        INSERT DATA {
          <${WORLDS.Chunk}> a <http://www.w3.org/2000/01/rdf-schema#Class> .
          <${WORLDS.hasContent}> a <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property> ;
            <http://www.w3.org/2000/01/rdf-schema#domain> <${WORLDS.Chunk}> ;
            <http://www.w3.org/2000/01/rdf-schema#range> <http://www.w3.org/2001/XMLSchema#string> .
          <${WORLDS.hasEmbedding}> a <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property> ;
            <http://www.w3.org/2000/01/rdf-schema#domain> <${WORLDS.Chunk}> ;
            <http://www.w3.org/2000/01/rdf-schema#range> <http://www.w3.org/2001/XMLSchema#string> .
        }
      `,
    });
  }
}