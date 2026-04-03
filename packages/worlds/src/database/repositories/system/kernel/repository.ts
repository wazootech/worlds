import { KERNEL, KERNEL_WORLD_ID } from "#/ontology.ts";
import type { WorldsInterface } from "#/types.ts";
import type { SparqlAskResults, SparqlBinding } from "#/schemas/sparql.ts";

/**
 * KernelRepository handles platform-level multitenancy metadata.
 * It queries the reserved Kernel World to resolve API keys and
 * verify organization ownership.
 */
export class KernelRepository {
  /**
   * constructor initializes the KernelRepository with the Kernel World engine.
   * @param kernel The Kernel World engine instance.
   */
  constructor(private readonly worlds: WorldsInterface) {}

  /**
   * resolveNamespace find the namespace ID linked to the provided API key.
   * @param apiKey The API key secret to resolve.
   * @returns The Namespace ID or null if not found.
   */
  async resolveNamespace(apiKey: string): Promise<string | null> {
    const result = await this.worlds.sparql({
      world: KERNEL_WORLD_ID,
      query: `
        SELECT ?org WHERE {
          ?key a <${KERNEL.ApiKey}> ;
               <${KERNEL.hasSecret}> "${apiKey}" ;
               <${KERNEL.belongsTo}> ?org .
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
   * @param worldId The world ID to check.
   * @param namespaceId The namespace ID to verify against.
   */
  async isWorldAuthorized(
    worldId: string,
    namespaceId: string,
  ): Promise<boolean> {
    const result = await this.worlds.sparql({
      world: KERNEL_WORLD_ID,
      query: `
        ASK {
          ?world a <${KERNEL.World}> ;
                 <${KERNEL.belongsTo}> <${namespaceId}> .
          FILTER(STR(?world) = "${worldId}" || STR(?world) = "${KERNEL.BASE}worlds/${worldId}")
        }
      `,
    });

    if (!result || !("boolean" in result)) {
      return false;
    }

    return (result as SparqlAskResults).boolean === true;
  }
}
