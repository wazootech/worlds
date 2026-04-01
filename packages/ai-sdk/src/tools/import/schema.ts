import { z } from "zod";
import type { WorldsContentType } from "@wazoo/worlds-sdk";
import { worldsContentTypeSchema } from "@wazoo/worlds-sdk";

/** WorldsImportInput is the input for importing RDF data into a world. */
export interface WorldsImportInput {
  world: string;
  data: string;
  contentType?: WorldsContentType;
}

/** worldsImportInputSchema is the Zod schema for world import input. */
export const worldsImportInputSchema: z.ZodType<WorldsImportInput> = z.object({
  world: z.string().describe("The world ID to import data into"),
  data: z.string().describe("RDF data string"),
  contentType: worldsContentTypeSchema.optional().describe(
    "The RDF content type (e.g., text/turtle)",
  ),
});

/** WorldsImportOutput is the output for importing RDF data into a world. */
export interface WorldsImportOutput {
  success: boolean;
}

/** worldsImportOutputSchema is the Zod schema for world import output. */
export const worldsImportOutputSchema: z.ZodType<WorldsImportOutput> = z.object(
  {
    success: z.boolean(),
  },
);
