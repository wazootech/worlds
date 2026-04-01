import { z } from "zod";
import type { WorldsContentType } from "@wazoo/worlds-sdk";
import { worldsContentTypeSchema } from "@wazoo/worlds-sdk";

/** WorldsExportInput is the input for exporting RDF data from a world. */
export interface WorldsExportInput {
  world: string;
  contentType?: WorldsContentType;
}

/** worldsExportInputSchema is the Zod schema for world export input. */
export const worldsExportInputSchema: z.ZodType<WorldsExportInput> = z.object({
  world: z.string().describe("The world ID to export"),
  contentType: worldsContentTypeSchema.optional().describe(
    "The requested RDF content type (e.g., application/n-quads)",
  ),
});

/** WorldsExportOutput is the output for exporting RDF data from a world. */
export interface WorldsExportOutput {
  data: string;
}

/** worldsExportOutputSchema is the Zod schema for world export output. */
export const worldsExportOutputSchema: z.ZodType<WorldsExportOutput> = z.object(
  {
    data: z.string(),
  },
);
