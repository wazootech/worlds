import { toWorldName } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions, Source } from "./types.ts";
import {
  createWorldsSparqlTool,
  type WorldsSparqlTool,
} from "./tools/sparql.ts";
import type { WorldsSearchTool } from "./tools/search.ts";
import { createWorldsSearchTool } from "./tools/search.ts";
import type { WorldsListTool } from "./tools/list.ts";
import { createWorldsListTool } from "./tools/list.ts";
import type { WorldsGetTool } from "./tools/get.ts";
import { createWorldsGetTool } from "./tools/get.ts";
import type { WorldsCreateTool } from "./tools/create.ts";
import { createWorldsCreateTool } from "./tools/create.ts";
import type { WorldsUpdateTool } from "./tools/update.ts";
import { createWorldsUpdateTool } from "./tools/update.ts";
import type { WorldsDeleteTool } from "./tools/delete.ts";
import { createWorldsDeleteTool } from "./tools/delete.ts";
import type { WorldsImportTool } from "./tools/import.ts";
import { createWorldsImportTool } from "./tools/import.ts";
import type { WorldsExportTool } from "./tools/export.ts";
import { createWorldsExportTool } from "./tools/export.ts";

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
} {
  const normalizedSources: Source[] = options.sources.map((source) =>
    typeof source === "string" ? source : source as Source
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
    const worldName = toWorldName(source);
    if (seen.has(worldName)) {
      throw new Error(`Duplicate source: ${worldName}`);
    }

    seen.add(worldName);

    if (typeof source === "object" && source !== null) {
      const s = source as Record<string, unknown>; // Cast for mode check
      if (s.mode === "write" || s.write === true) {
        if (writable) {
          throw new Error("Multiple writable sources are not allowed.");
        }

        writable = true;
      }
    }
  }
}
