import { z } from "zod";
import {
  createWorldParamsSchema,
  executeSparqlOutputSchema,
  isSparqlUpdate,
  tripleSearchResultSchema,
  worldSchema,
} from "@wazoo/worlds-sdk";

export const toolSchemas = {
  worldsQuery: z.object({
    world: z.string().describe("The world ID to query"),
    query: z.string().describe("SPARQL query string"),
  }),
  worldsList: z.object({
    page: z.number().default(1).describe("Page number"),
    pageSize: z.number().default(20).describe("Page size"),
  }),
  worldsGet: z.object({
    world: z.string().describe("The world ID to retrieve"),
  }),
  worldsCreate: createWorldParamsSchema,
  worldsImport: z.object({
    world: z.string().describe("The world ID to import data into"),
    data: z.string().describe("RDF data in N-Triples or N-Quads format"),
  }),
  worldsExport: z.object({
    world: z.string().describe("The world ID to export"),
  }),
  worldsSearch: z.object({
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
  }),
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

export type ToolSchemas = typeof toolSchemas;
export type ToolDescriptions = typeof toolDescriptions;

export const worldsQuerySchema = toolSchemas.worldsQuery;
export type WorldsQueryInput = z.infer<typeof worldsQuerySchema>;

export const worldsListSchema = toolSchemas.worldsList;
export type WorldsListInput = z.infer<typeof worldsListSchema>;

export const worldsGetSchema = toolSchemas.worldsGet;
export type WorldsGetInput = z.infer<typeof worldsGetSchema>;

export const worldsCreateSchema = toolSchemas.worldsCreate;
export type WorldsCreateInput = z.infer<typeof worldsCreateSchema>;

export const worldsImportSchema = toolSchemas.worldsImport;
export type WorldsImportInput = z.infer<typeof worldsImportSchema>;

export const worldsExportSchema = toolSchemas.worldsExport;
export type WorldsExportInput = z.infer<typeof worldsExportSchema>;

export const worldsSearchSchema = toolSchemas.worldsSearch;
export type WorldsSearchInput = z.infer<typeof worldsSearchSchema>;

export const worldsListOutputSchema = z.object({
  worlds: z.array(worldSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});
export type WorldsListOutput = z.infer<typeof worldsListOutputSchema>;

export const worldsSearchOutputSchema = z.object({
  results: z.array(tripleSearchResultSchema),
});
export type WorldsSearchOutput = z.infer<typeof worldsSearchOutputSchema>;

export { executeSparqlOutputSchema, isSparqlUpdate } from "@wazoo/worlds-sdk";
