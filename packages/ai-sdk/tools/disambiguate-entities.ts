import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import {
  type TripleSearchResult,
  tripleSearchResultSchema,
} from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "#/options.ts";

/**
 * DisambiguateEntitiesInput is the input to the disambiguateEntities tool.
 */
export interface DisambiguateEntitiesInput {
  candidates: TripleSearchResult[];
  query: string;
}

/**
 * disambiguateEntitiesInputSchema is the input schema for the disambiguateEntities tool.
 */
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

/**
 * DisambiguateEntitiesOutput is the output of the disambiguateEntities tool.
 */
export interface DisambiguateEntitiesOutput {
  match: TripleSearchResult | null;
  confidence: number;
  reason: string;
}

/**
 * disambiguateEntitiesOutputSchema is the output schema for the disambiguateEntities tool.
 */
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

/**
 * DisambiguateEntitiesTool is a tool that helps an agent narrow down search results.
 */
export type DisambiguateEntitiesTool = Tool<
  DisambiguateEntitiesInput,
  DisambiguateEntitiesOutput
>;

/**
 * createDisambiguateEntitiesTool creates a tool that helps an agent narrow down search results.
 */
export function createDisambiguateEntitiesTool(
  {
    disambiguate = defaultDisambiguate,
  }: Partial<CreateToolsOptions> = {},
): DisambiguateEntitiesTool {
  return tool({
    description:
      "Take a list of search candidates and pick the most likely match for the given query. " +
      "This provides a deterministic way to resolve entities and avoid creating duplicates.",
    inputSchema: disambiguateEntitiesInputSchema,
    outputSchema: disambiguateEntitiesOutputSchema,
    execute: async (input: DisambiguateEntitiesInput) => {
      return await disambiguate(input);
    },
  });
}

/**
 * defaultDisambiguate is the default implementation of the disambiguateEntities tool.
 */
export function defaultDisambiguate({
  candidates,
  query,
}: DisambiguateEntitiesInput): DisambiguateEntitiesOutput {
  if (candidates.length === 0) {
    return { match: null, confidence: 0, reason: "No candidates provided." };
  }

  // Filter for exact label matches first
  const exactMatch = candidates.find(
    (c) => c.object.toLowerCase() === query.toLowerCase(),
  );
  if (exactMatch) {
    return {
      match: exactMatch,
      confidence: 1.0,
      reason: `Exact label match found for '${query}'.`,
    };
  }

  // Simple heuristic: pick the highest score from the search results
  // (Search results are already ranked by RRF)
  const best = candidates[0];

  // If the top score is high enough (arbitrary threshold for demonstration), return it as a match
  if (best.score > 0.5) {
    return {
      match: best,
      confidence: best.score,
      reason: `Highest ranking candidate selected based on RRF score.`,
    };
  }

  return {
    match: null,
    confidence: best.score,
    reason:
      "Candidates are too low-confidence or ambiguous. Agent should consider creating a new IRI or refining the search.",
  };
}
