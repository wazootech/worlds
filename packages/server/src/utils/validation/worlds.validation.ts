import { z } from "zod";
import type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  QueryWorldRequest,
  SearchWorldsRequest,
  SparqlQueryRequest,
  UpdateWorldRequest,
} from "@wazoo/worlds-sdk";

/**
 * sourceSchema handles world identifiers or names.
 */
export const sourceSchema = z.union([
  z.string(),
  z.object({
    namespace: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
  }),
]);

/**
 * contentTypeSchema handles supported media types.
 */
export const contentTypeSchema = z.enum([
  "application/n-quads",
  "application/n-triples",
  "text/turtle",
  "application/ld+json",
]).optional();

export const worldsGetInputSchema = z.object({
  source: sourceSchema,
}) as z.ZodType<GetWorldRequest>;

export const worldsCreateInputSchema = z.object({
  parent: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  world: z.string().optional(),
  displayName: z.string(),
  description: z.string().optional(),
}) as z.ZodType<CreateWorldRequest>;

export const worldsUpdateInputSchema = z.object({
  source: sourceSchema,
  displayName: z.string().optional(),
  description: z.string().optional(),
}) as z.ZodType<UpdateWorldRequest>;

export const worldsDeleteInputSchema = z.object({
  source: sourceSchema,
}) as z.ZodType<DeleteWorldRequest>;

export const worldsListInputSchema = z.object({
  parent: z.string().optional(),
  pageSize: z.number().int().positive().max(1000).optional(),
  pageToken: z.string().optional(),
}) as z.ZodType<ListWorldsRequest>;

export const worldsExportInputSchema = z.object({
  source: sourceSchema,
  contentType: contentTypeSchema,
}) as z.ZodType<ExportWorldRequest>;

export const worldsImportInputSchema = z.object({
  source: sourceSchema,
  data: z.union([z.string(), z.instanceof(ArrayBuffer)]),
  contentType: contentTypeSchema,
}) as z.ZodType<ImportWorldRequest>;

export const worldsSearchInputSchema = z.object({
  query: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  predicates: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  parent: z.string().optional(),
  pageSize: z.number().optional(),
}) as z.ZodType<SearchWorldsRequest>;

export const worldsSparqlInputSchema = z.object({
  sources: z.array(sourceSchema).optional(),
  parent: z.string().optional(),
  query: z.string(),
}) as z.ZodType<SparqlQueryRequest>;

export const worldsQueryInputSchema = z.object({
  source: sourceSchema,
  query: z.string(),
}) as z.ZodType<QueryWorldRequest>;
