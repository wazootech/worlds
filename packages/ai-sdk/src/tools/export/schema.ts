import { z } from "zod";

export { worldsExportInputSchema } from "@wazoo/worlds-sdk";
export type { WorldsExportInput } from "@wazoo/worlds-sdk";

/** WorldsExportOutput is the output for exporting RDF data from a world in the AI SDK. */
export interface WorldsExportOutput {
  data: string;
}

/** worldsExportOutputSchema is the Zod schema for world export output. */
export const worldsExportOutputSchema: z.ZodType<WorldsExportOutput> = z.object(
  {
    data: z.string(),
  },
);
