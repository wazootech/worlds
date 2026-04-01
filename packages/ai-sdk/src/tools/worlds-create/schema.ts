import { z } from "zod";
import { worldSchema } from "@wazoo/worlds-sdk";

export interface WorldsCreateInput {
  slug: string;
  label: string;
  description?: string | null;
}

export const worldsCreateInputSchema: z.ZodType<WorldsCreateInput> = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

export const worldsCreateOutputSchema = worldSchema;
