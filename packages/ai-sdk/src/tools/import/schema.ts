import { z } from "zod";

export { worldsImportInputSchema } from "@wazoo/worlds-sdk";
export type { WorldsImportInput } from "@wazoo/worlds-sdk";

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
