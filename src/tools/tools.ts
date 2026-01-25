import { ulid } from "@std/ulid/ulid";
import { createExecuteSparqlTool } from "./execute-sparql/tool.ts";
import { createSearchFactsTool } from "./search-facts/tool.ts";
import { createGenerateIriTool } from "./generate-iri/tool.ts";
import type { CreateToolsOptions } from "./types.ts";

/**
 * generateIri generates a random IRI using the ulid library
 * and a default prefix.
 */
export function generateIri(generateId: () => string = ulid): string {
  return `https://wazoo.tech/.well-known/genid/${generateId()}`;
}

export function createTools(options: CreateToolsOptions): {
  executeSparql: ReturnType<typeof createExecuteSparqlTool>;
  searchFacts: ReturnType<typeof createSearchFactsTool>;
  generateIri?: ReturnType<typeof createGenerateIriTool>;
} {
  const tools: {
    executeSparql: ReturnType<typeof createExecuteSparqlTool>;
    searchFacts: ReturnType<typeof createSearchFactsTool>;
    generateIri?: ReturnType<typeof createGenerateIriTool>;
  } = {
    executeSparql: createExecuteSparqlTool(options),
    searchFacts: createSearchFactsTool(options),
  };

  if (options.write) {
    tools.generateIri = createGenerateIriTool(
      options.generateIri ?? generateIri,
      options,
    );
  }

  return tools;
}
