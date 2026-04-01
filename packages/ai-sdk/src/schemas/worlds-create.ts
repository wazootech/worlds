import { z } from "zod";

export interface WorldsCreateInput {
  slug: string;
  label: string;
  description?: string | null;
}

export const worldsCreateSchema: z.ZodType<WorldsCreateInput> = z.object({
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

export const worldsCreateToolDefinition = {
  name: "worlds_create",
  description: "Create a new world",
  inputSchema: worldsCreateSchema,
} as const;
