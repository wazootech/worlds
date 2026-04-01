import type { DiscoverSchemaTool } from "./tools/discover-schema/mod.ts";
import type { ExecuteSparqlTool } from "./tools/execute-sparql/mod.ts";
import type { GenerateIriTool } from "./tools/generate-iri/mod.ts";
import type { SearchEntitiesTool } from "./tools/search-entities/mod.ts";
import type { DisambiguateEntitiesTool } from "./tools/disambiguate-entities/mod.ts";
import type { ValidateRdfTool } from "./tools/validate-rdf/mod.ts";
import { createDiscoverSchemaTool } from "./tools/discover-schema/mod.ts";
import { createExecuteSparqlTool } from "./tools/execute-sparql/mod.ts";
import { createGenerateIriTool } from "./tools/generate-iri/mod.ts";
import { createSearchEntitiesTool } from "./tools/search-entities/mod.ts";
import { createDisambiguateEntitiesTool } from "./tools/disambiguate-entities/mod.ts";
import { createValidateRdfTool } from "./tools/validate-rdf/mod.ts";
import type { CreateToolsOptions } from "./options.ts";
import type { Source } from "@wazoo/worlds-sdk";

/**
 * createTools creates a toolset from a CreateToolsOptions.
 */
export function createTools(options: CreateToolsOptions): {
  discoverSchema: DiscoverSchemaTool;
  executeSparql: ExecuteSparqlTool;
  generateIri: GenerateIriTool;
  searchEntities: SearchEntitiesTool;
  disambiguateEntities: DisambiguateEntitiesTool;
  validateRdf: ValidateRdfTool;
} {
  const normalizedSources: Source[] = options.sources.map((s) =>
    typeof s === "string" ? { world: s } : s
  );
  const normalizedOptions = { ...options, sources: normalizedSources };

  validateCreateToolsOptions(
    normalizedOptions as unknown as CreateToolsOptions,
  );

  return {
    discoverSchema: createDiscoverSchemaTool(
      normalizedOptions as unknown as CreateToolsOptions,
    ),
    executeSparql: createExecuteSparqlTool(
      normalizedOptions as unknown as CreateToolsOptions,
    ),
    generateIri: createGenerateIriTool(
      normalizedOptions as unknown as CreateToolsOptions,
    ),
    searchEntities: createSearchEntitiesTool(
      normalizedOptions as unknown as CreateToolsOptions,
    ),
    disambiguateEntities: createDisambiguateEntitiesTool(
      normalizedOptions as unknown as CreateToolsOptions,
    ),
    validateRdf: createValidateRdfTool(
      normalizedOptions as unknown as CreateToolsOptions,
    ),
  };
}

/**
 * validateCreateToolsOptions enforces constraints on CreateToolsOptions.
 */
export function validateCreateToolsOptions(options: CreateToolsOptions) {
  if (options.sources.length === 0) {
    throw new Error("Sources must have at least one source.");
  }

  let writable = false;
  const seen = new Set<string>();
  for (const source of options.sources) {
    const s = typeof source === "string" ? { world: source } : source;
    if (seen.has(s.world)) {
      throw new Error(`Duplicate source: ${s.world}`);
    }

    seen.add(s.world);

    if (s.write) {
      if (writable) {
        throw new Error("Multiple writable sources are not allowed.");
      }

      writable = true;
    }
  }
}
