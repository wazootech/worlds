import { z } from "zod";
import { tripleSearchResultSchema } from "@wazoo/worlds-sdk";
import type { TripleSearchResult } from "@wazoo/worlds-sdk";

/** DisambiguateEntitiesInput is the input to the entity disambiguation tool. */
export interface DisambiguateEntitiesInput {
  candidates: TripleSearchResult[];
  query: string;
}

/** disambiguateEntitiesInputSchema is the Zod schema for entity disambiguation input. */
export const disambiguateEntitiesInputSchema: z.ZodType<
  DisambiguateEntitiesInput
> = z.object({
  candidates: z.array(tripleSearchResultSchema).describe(
    "A list of potential entity matches from a previous search.",
  ),
  query: z.string().describe(
    "The name or description of the entity you are trying to resolve.",
  ),
});

/** DisambiguateEntitiesOutput is the output of the entity disambiguation tool. */
export interface DisambiguateEntitiesOutput {
  match: TripleSearchResult | null;
  confidence: number;
  reason: string;
}

/** disambiguateEntitiesOutputSchema is the Zod schema for entity disambiguation output. */
export const disambiguateEntitiesOutputSchema: z.ZodType<
  DisambiguateEntitiesOutput
> = z.object({
  match: tripleSearchResultSchema.nullable().describe(
    "The best matching entity, if any.",
  ),
  confidence: z.number().describe(
    "A confidence score (0-1) for the match.",
  ),
  reason: z.string().describe(
    "The rationale for selecting this match or for returning null.",
  ),
});
