import { z } from "zod";
import { entitySchema } from "../../schema.ts";
import type { EntitySchema } from "../../schema.ts";

/**
 * DiscoverSchemaInput is the input to the discoverSchema tool.
 */
export interface DiscoverSchemaInput {
  source: string;
  referenceText: string;
  limit?: number;
}

/**
 * discoverSchemaInputSchema is the input schema for the discoverSchema tool.
 */
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

/**
 * DiscoverSchemaResult is a result of the discoverSchema tool.
 */
export type DiscoverSchemaResult = EntitySchema;

/**
 * discoverSchemaResultSchema is the schema for the discoverSchema tool.
 */
export const discoverSchemaResultSchema: z.ZodType<DiscoverSchemaResult> =
  entitySchema;

/**
 * DiscoverSchemaOutput is the output of the discoverSchema tool.
 */
export interface DiscoverSchemaOutput {
  results: DiscoverSchemaResult[];
}

/**
 * discoverSchemaOutputSchema is the output schema for the discoverSchema tool.
 */
export const discoverSchemaOutputSchema: z.ZodType<DiscoverSchemaOutput> = z
  .object({
    results: z.array(discoverSchemaResultSchema),
  });
