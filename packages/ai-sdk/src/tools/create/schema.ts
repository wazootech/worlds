import { z } from "zod";
import { worldSchema } from "@wazoo/worlds-sdk";

/** WorldsCreateInput is the input for creating a world. */
export interface WorldsCreateInput {
  slug: string;
  label: string;
  description?: string | null;
}

/** worldsCreateInputSchema is the Zod schema for world creation input. */
export const worldsCreateInputSchema: z.ZodType<WorldsCreateInput> = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

/** worldsCreateOutputSchema is the Zod schema for world creation output. */
export const worldsCreateOutputSchema = worldSchema;
