import type { Source } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "#/types.ts";

import type { WorldsSparqlTool } from "#/tools/sparql/tool.ts";
import type { WorldsSearchTool } from "#/tools/search/tool.ts";
import type { WorldsListTool } from "#/tools/list/tool.ts";
import type { WorldsGetTool } from "#/tools/get/tool.ts";
import type { WorldsCreateTool } from "#/tools/create/tool.ts";
import type { WorldsUpdateTool } from "#/tools/update/tool.ts";
import type { WorldsDeleteTool } from "#/tools/delete/tool.ts";
import type { WorldsImportTool } from "#/tools/import/tool.ts";
import type { WorldsExportTool } from "#/tools/export/tool.ts";
import type { WorldsLogsTool } from "#/tools/logs/tool.ts";

import { createWorldsSparqlTool } from "#/tools/sparql/tool.ts";
import { createWorldsSearchTool } from "#/tools/search/tool.ts";
import { createWorldsListTool } from "#/tools/list/tool.ts";
import { createWorldsGetTool } from "#/tools/get/tool.ts";
import { createWorldsCreateTool } from "#/tools/create/tool.ts";
import { createWorldsUpdateTool } from "#/tools/update/tool.ts";
import { createWorldsDeleteTool } from "#/tools/delete/tool.ts";
import { createWorldsImportTool } from "#/tools/import/tool.ts";
import { createWorldsExportTool } from "#/tools/export/tool.ts";
import { createWorldsLogsTool } from "#/tools/logs/tool.ts";

/**
 * createTools creates a toolset from a CreateToolsOptions.
 */
export function createTools(options: CreateToolsOptions): {
  sparql: WorldsSparqlTool;
  search: WorldsSearchTool;
  list: WorldsListTool;
  get: WorldsGetTool;
  create: WorldsCreateTool;
  update: WorldsUpdateTool;
  delete: WorldsDeleteTool;
  import: WorldsImportTool;
  export: WorldsExportTool;
  logs: WorldsLogsTool;
} {
  const normalizedSources: Source[] = options.sources.map((source) =>
    typeof source === "string" ? { world: source } : source
  );
  const normalizedOptions: CreateToolsOptions = {
    ...options,
    sources: normalizedSources,
  };

  validateCreateToolsOptions(normalizedOptions);

  return {
    sparql: createWorldsSparqlTool(normalizedOptions),
    search: createWorldsSearchTool(normalizedOptions),
    list: createWorldsListTool(normalizedOptions),
    get: createWorldsGetTool(normalizedOptions),
    create: createWorldsCreateTool(normalizedOptions),
    update: createWorldsUpdateTool(normalizedOptions),
    delete: createWorldsDeleteTool(normalizedOptions),
    import: createWorldsImportTool(normalizedOptions),
    export: createWorldsExportTool(normalizedOptions),
    logs: createWorldsLogsTool(normalizedOptions),
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
