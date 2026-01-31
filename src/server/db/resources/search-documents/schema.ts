import { z } from "zod";

/**
 * searchDocumentTableSchema is the Zod schema for the search_documents database table.
 * This represents the raw database row structure including the embedding.
 */
export const searchDocumentTableSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  world_id: z.string(),
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  embedding: z
    .union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
    .nullable(),
});

/**
 * SearchDocumentTable represents a search document record as stored in the database.
 */
export type SearchDocumentTable = z.infer<typeof searchDocumentTableSchema>;

/**
 * searchDocumentRowSchema is the Zod schema for a search document record as returned by search queries.
 * This omits the large embedding field for performance.
 */
export const searchDocumentRowSchema = searchDocumentTableSchema.omit({
  embedding: true,
});

/**
 * SearchDocumentRow represents a search document record without the embedding field.
 */
export type SearchDocumentRow = z.infer<typeof searchDocumentRowSchema>;

/**
 * searchDocumentTableUpsertSchema is the Zod schema for inserting or replacing a search document.
 */
export const searchDocumentTableUpsertSchema = searchDocumentTableSchema;

/**
 * SearchDocumentTableUpsert represents the data needed to upsert a search document.
 */
export type SearchDocumentTableUpsert = z.infer<
  typeof searchDocumentTableUpsertSchema
>;
