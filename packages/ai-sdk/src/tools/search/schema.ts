import { z } from "zod";
import { worldsSearchOutputSchema as engineWorldsSearchOutputSchema } from "@wazoo/worlds-sdk";

import type { WorldsSearchInput, WorldsSearchOutput } from "@wazoo/worlds-sdk";

export { worldsSearchInputSchema } from "@wazoo/worlds-sdk";
export type { WorldsSearchInput, WorldsSearchOutput };

/** WorldsSearchOutputData is the wrapper for search results in the AI SDK. */
export interface WorldsSearchOutputData {
  results: WorldsSearchOutput[];
}

/** worldsSearchOutputSchema is the Zod schema for search output. */
export const worldsSearchOutputSchema: z.ZodType<WorldsSearchOutputData> = z
  .object({
    results: z.array(engineWorldsSearchOutputSchema),
  });
