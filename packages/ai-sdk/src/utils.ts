import type { Source } from "@wazoo/worlds-sdk";

import type { ExecuteSparqlTool } from "#/tools/sparql/mod.ts";
import type { SearchEntitiesTool } from "#/tools/search/mod.ts";
import type { WorldsListTool } from "#/tools/list/mod.ts";
import type { WorldsGetTool } from "#/tools/get/mod.ts";
import type { WorldsCreateTool } from "#/tools/create/mod.ts";
import type { WorldsUpdateTool } from "#/tools/update/mod.ts";
import type { WorldsDeleteTool } from "#/tools/delete/mod.ts";
import type { WorldsImportTool } from "#/tools/import/mod.ts";
import type { WorldsExportTool } from "#/tools/export/mod.ts";
import type { LogsListTool } from "#/tools/logs/mod.ts";

import { createExecuteSparqlTool } from "#/tools/sparql/mod.ts";
import { createSearchEntitiesTool } from "#/tools/search/mod.ts";
import { createWorldsListTool } from "#/tools/list/mod.ts";
import { createWorldsGetTool } from "#/tools/get/mod.ts";
import { createWorldsCreateTool } from "#/tools/create/mod.ts";
import { createWorldsUpdateTool } from "#/tools/update/mod.ts";
import { createWorldsDeleteTool } from "#/tools/delete/mod.ts";
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
  list: WorldsListTool;
  get: WorldsGetTool;
  create: WorldsCreateTool;
  update: WorldsUpdateTool;
  delete: WorldsDeleteTool;
  import: WorldsImportTool;
  export: WorldsExportTool;
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
    list: createWorldsListTool(normalizedOptions),
    get: createWorldsGetTool(normalizedOptions),
    create: createWorldsCreateTool(normalizedOptions),
    update: createWorldsUpdateTool(normalizedOptions),
    delete: createWorldsDeleteTool(normalizedOptions),
    import: createWorldsImportTool(normalizedOptions),
    export: createWorldsExportTool(normalizedOptions),
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
