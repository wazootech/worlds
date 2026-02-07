import { z } from "zod";
import type { Source } from "#/sdk/interfaces.ts";

export type { Source };

/**
 * sourceSchema is the Zod schema for a source.
 */
export const sourceSchema: z.ZodType<Source> = z.object({
  id: z.string().describe("The ID of the source."),
  writable: z.boolean().optional().describe("Whether the source is writable."),
  schema: z.boolean().optional().describe(
    "Whether the source is a schema source.",
  ),
});
