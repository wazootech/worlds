import { WORLDS, WORLDS_WORLD_ID } from "#/core/ontology.ts";
import type { WorldsInterface } from "#/core/types.ts";
import type { SparqlAskResults, SparqlBinding } from "#/schemas/sparql.ts";

/**
 * RegistryRepository handles platform-level multitenancy metadata.
 * It queries the reserved Registry World to resolve API keys and
 * verify organization ownership.
 */
export class RegistryRepository {
  /**
   * constructor initializes the RegistryRepository with the Registry World engine.
   * @param worlds The Registry World engine instance.
   */
  constructor(private readonly worlds: WorldsInterface) {}

  /**
   * resolveNamespace find the namespace ID linked to the provided API key.
   * @param apiKey The API key secret to resolve.
   * @returns The Namespace ID or null if not found.
   */
  async resolveNamespace(apiKey: string): Promise<string | null> {
    const result = await this.worlds.sparql({
      world: WORLDS_WORLD_ID,
      query: `
        SELECT ?org WHERE {
          ?key a <${WORLDS.ApiKey}> ;
               <${WORLDS.hasSecret}> "${apiKey}" ;
               <${WORLDS.belongsTo}> ?org .
        }
        LIMIT 1
      `,
    });

    // Type narrowing for SPARQL SELECT results
    if (!result || !("results" in result)) {
      return null;
    }

    const results = result.results as { bindings?: SparqlBinding[] };
    if (!results.bindings || !results.bindings[0]) {
      return null;
    }

    const org = results.bindings[0].org;
    if (!org || org.type !== "uri") {
      return null;
    }

    return org.value;
  }

  /**
   * isWorldAuthorized verifies if a world belongs to a namespace.
   * @param worldId The world slug (ID) to check.
   * @param namespaceId The namespace ID to verify against.
   */
  async isWorldAuthorized(
    worldId: string,
    namespaceId: string,
  ): Promise<boolean> {
    const result = await this.worlds.sparql({
      world: WORLDS_WORLD_ID,
      query: `
        ASK {
          ?world a <${WORLDS.World}> ;
                 <${WORLDS.belongsTo}> <${namespaceId}> .
          FILTER(STR(?world) = "${worldId}" || STR(?world) = "${WORLDS.BASE}worlds/${worldId}")
        }
      `,
    });

    if (!result || !("boolean" in result)) {
      return false;
    }

    return (result as SparqlAskResults).boolean === true;
  }
}

