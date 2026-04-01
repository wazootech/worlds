import { z } from "zod";
import { worldSchema } from "@wazoo/worlds-sdk";

export interface WorldsListInput {
  page?: number;
  pageSize?: number;
}

export const worldsListInputSchema: z.ZodType<WorldsListInput> = z.object({
  page: z.number().default(1).describe("Page number"),
  pageSize: z.number().default(20).describe("Page size"),
});

export interface WorldsListOutput {
  worlds: z.infer<typeof worldSchema>[];
}

export const worldsListOutputSchema: z.ZodType<WorldsListOutput> = z.object({
  worlds: z.array(worldSchema),
});
