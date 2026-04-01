import type { Source } from "@wazoo/worlds-sdk";

import type { ExecuteSparqlTool } from "#/tools/sparql/mod.ts";
import type { GenerateIriTool } from "#/tools/generate/mod.ts";
import type { SearchEntitiesTool } from "#/tools/search/mod.ts";
import type { DisambiguateEntitiesTool } from "#/tools/match/mod.ts";
import type { ValidateRdfTool } from "#/tools/validate/mod.ts";
import type { WorldsListTool } from "#/tools/list/mod.ts";
import type { WorldsGetTool } from "#/tools/get/mod.ts";
import type { WorldsCreateTool } from "#/tools/create/mod.ts";
import type { WorldsImportTool } from "#/tools/import/mod.ts";
import type { WorldsExportTool } from "#/tools/export/mod.ts";
import type { LogsListTool } from "#/tools/logs/mod.ts";

import { createExecuteSparqlTool } from "#/tools/sparql/mod.ts";
import { createGenerateIriTool } from "#/tools/generate/mod.ts";
import { createSearchEntitiesTool } from "#/tools/search/mod.ts";
import { createDisambiguateEntitiesTool } from "#/tools/match/mod.ts";
import { createValidateRdfTool } from "#/tools/validate/mod.ts";
import { createWorldsListTool } from "#/tools/list/mod.ts";
import { createWorldsGetTool } from "#/tools/get/mod.ts";
import { createWorldsCreateTool } from "#/tools/create/mod.ts";
import { createWorldsImportTool } from "#/tools/import/mod.ts";
import { createWorldsExportTool } from "#/tools/export/mod.ts";
import { createLogsTool } from "#/tools/logs/mod.ts";

import type { CreateToolsOptions } from "#/options.ts";

/**
 * createTools creates a toolset from a CreateToolsOptions.
 */
export function createTools(options: CreateToolsOptions): {
  sparql: ExecuteSparqlTool;
  search: SearchEntitiesTool;
  match: DisambiguateEntitiesTool;
  list: WorldsListTool;
  get: WorldsGetTool;
  create: WorldsCreateTool;
  import: WorldsImportTool;
  export: WorldsExportTool;
  generate: GenerateIriTool;
  validate: ValidateRdfTool;
  logs: LogsListTool;
} {
  const normalizedSources: Source[] = options.sources.map((s) =>
    typeof s === "string" ? { world: s } : s
  );
  const normalizedOptions: CreateToolsOptions = {
    ...options,
    sources: normalizedSources,
  };

  validateCreateToolsOptions(normalizedOptions);

  return {
    sparql: createExecuteSparqlTool(normalizedOptions),
    search: createSearchEntitiesTool(normalizedOptions),
    match: createDisambiguateEntitiesTool(normalizedOptions),
    list: createWorldsListTool(normalizedOptions),
    get: createWorldsGetTool(normalizedOptions),
    create: createWorldsCreateTool(normalizedOptions),
    import: createWorldsImportTool(normalizedOptions),
    export: createWorldsExportTool(normalizedOptions),
    generate: createGenerateIriTool(normalizedOptions),
    validate: createValidateRdfTool(normalizedOptions),
    logs: createLogsTool(normalizedOptions),
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
