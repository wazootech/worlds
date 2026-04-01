import { z } from "zod";
import { worldSchema, tripleSearchResultSchema } from "@wazoo/worlds-sdk";

export interface WorldsQueryInput {
  world: string;
  query: string;
}

export interface WorldsListInput {
  page?: number;
  pageSize?: number;
}

export interface WorldsGetInput {
  world: string;
}

export interface WorldsCreateInput {
  slug: string;
  label: string;
  description?: string | null;
}

export interface WorldsImportInput {
  world: string;
  data: string;
}

export interface WorldsExportInput {
  world: string;
}

export interface WorldsSearchInput {
  world: string;
  query: string;
  types?: string[];
  subjects?: string[];
  predicates?: string[];
  limit?: number;
}

export interface WorldsListOutput {
  worlds: z.infer<typeof worldSchema>[];
  page: number;
  pageSize: number;
  total: number;
}

export interface WorldsSearchOutput {
  results: z.infer<typeof tripleSearchResultSchema>[];
}

export const worldsQuerySchema: z.ZodType<WorldsQueryInput> = z.object({
  world: z.string().describe("The world ID to query"),
  query: z.string().describe("SPARQL query string"),
});

export const worldsListSchema: z.ZodType<WorldsListInput> = z.object({
  page: z.number().default(1).describe("Page number"),
  pageSize: z.number().default(20).describe("Page size"),
});

export const worldsGetSchema: z.ZodType<WorldsGetInput> = z.object({
  world: z.string().describe("The world ID to retrieve"),
});

export const worldsCreateSchema: z.ZodType<WorldsCreateInput> = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

export const worldsImportSchema: z.ZodType<WorldsImportInput> = z.object({
  world: z.string().describe("The world ID to import data into"),
  data: z.string().describe("RDF data in N-Triples or N-Quads format"),
});

export const worldsExportSchema: z.ZodType<WorldsExportInput> = z.object({
  world: z.string().describe("The world ID to export"),
});

export const worldsSearchSchema: z.ZodType<WorldsSearchInput> = z.object({
  world: z.string().describe("The world ID to search within"),
  query: z.string().describe("The search query"),
  types: z.array(z.string()).optional().describe(
    "Optional RDF types to filter by",
  ),
  subjects: z.array(z.string()).optional().describe(
    "Optional subjects to filter by",
  ),
  predicates: z.array(z.string()).optional().describe(
    "Optional predicates to filter by",
  ),
  limit: z.number().min(1).max(100).default(20).describe(
    "Maximum number of results",
  ),
});

export const worldsListOutputSchema: z.ZodType<WorldsListOutput> = z.object({
  worlds: z.array(worldSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export const worldsSearchOutputSchema: z.ZodType<WorldsSearchOutput> = z.object({
  results: z.array(tripleSearchResultSchema),
});

export const toolSchemas = {
  worldsQuery: worldsQuerySchema,
  worldsList: worldsListSchema,
  worldsGet: worldsGetSchema,
  worldsCreate: worldsCreateSchema,
  worldsImport: worldsImportSchema,
  worldsExport: worldsExportSchema,
  worldsSearch: worldsSearchSchema,
} as const;

export const toolDescriptions = {
  worldsQuery: "Query a Worlds knowledge graph using SPARQL",
  worldsList: "List all available worlds",
  worldsGet: "Get a world by ID",
  worldsCreate: "Create a new world",
  worldsImport: "Import RDF data into a world",
  worldsExport: "Export a world as RDF data",
  worldsSearch:
    "Search for facts in a Worlds knowledge graph using semantic search",
} as const;

export const toolNames = {
  worldsQuery: "worlds_query",
  worldsList: "worlds_list",
  worldsGet: "worlds_get",
  worldsCreate: "worlds_create",
  worldsImport: "worlds_import",
  worldsExport: "worlds_export",
  worldsSearch: "worlds_search",
} as const;

export type ToolSchemas = typeof toolSchemas;
export type ToolDescriptions = typeof toolDescriptions;
export type ToolNames = typeof toolNames;

export { executeSparqlOutputSchema, isSparqlUpdate } from "@wazoo/worlds-sdk";
