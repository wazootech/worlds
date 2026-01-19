import { create, search } from "@orama/orama";
import type {
  FactSearchEngine,
  SearchFactsOutput,
} from "#/tools/search-facts/fact-search-engine.ts";

/**
 * FactOrama is an Orama instance for facts.
 */
export type FactOrama = ReturnType<typeof createFactOrama>;

/**
 * createFactOrama creates an Orama instance for facts.
 *
 * @see
 * https://docs.orama.com/docs/orama-js/usage/insert#custom-document-ids
 */
export function createFactOrama() {
  return create({
    schema: {
      id: "string",
      subject: "string",
      predicate: "string",
      object: "string",
      graph: "string",
    },
  });
}

/**
 * OramaSearchEngine is a fact search engine that uses Orama.
 */
export class OramaSearchEngine implements FactSearchEngine {
  public constructor(private readonly orama: FactOrama) {}

  public async searchFacts(
    query: string,
    limit: number,
  ): Promise<SearchFactsOutput> {
    const results = await search(this.orama, {
      term: query,
      limit,
      properties: ["object"],
    });
    return results.hits.map((hit) => {
      return {
        id: hit.document.id,
        subject: hit.document.subject,
        predicate: hit.document.predicate,
        object: hit.document.object,
        score: hit.score,
      };
    });
  }
}
