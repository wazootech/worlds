import { z } from "zod";
import { entitySchema } from "#/schema.ts";
import type { EntitySchema } from "#/schema.ts";

/** DiscoverSchemaInput is the input for the schema discovery tool. */
export interface DiscoverSchemaInput {
  source: string;
  referenceText: string;
  limit?: number;
}

/** discoverSchemaInputSchema is the Zod schema for schema discovery input. */
export const discoverSchemaInputSchema: z.ZodType<DiscoverSchemaInput> = z
  .object({
    source: z.string().describe(
      "The ID or slug of the schema source to discover concepts from.",
    ),
    referenceText: z.string().describe(
      "A natural language description of the entities or properties to discover (e.g., 'A person with a name').",
    ),
    limit: z.number().min(1).max(100).optional().describe(
      "Maximum number of unique subjects to return (default: 10).",
    ),
  });

/** DiscoverSchemaResult is a single result from the schema discovery tool. */
export type DiscoverSchemaResult = EntitySchema;

/** discoverSchemaResultSchema is the Zod schema for a single discovery result. */
export const discoverSchemaResultSchema: z.ZodType<DiscoverSchemaResult> =
  entitySchema;

/** DiscoverSchemaOutput is the output of the schema discovery tool. */
export interface DiscoverSchemaOutput {
  results: DiscoverSchemaResult[];
}

/** discoverSchemaOutputSchema is the Zod schema for schema discovery output. */
export const discoverSchemaOutputSchema: z.ZodType<DiscoverSchemaOutput> = z
  .object({
    results: z.array(discoverSchemaResultSchema),
  });
