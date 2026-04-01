import { tool } from "ai";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  disambiguateEntitiesInputSchema,
  disambiguateEntitiesOutputSchema,
} from "#/tools/disambiguate-entities/schema.ts";
import type {
  DisambiguateEntitiesInput,
  DisambiguateEntitiesOutput,
} from "#/tools/disambiguate-entities/schema.ts";

/** defaultDisambiguate provides a heuristic-based entity selection. */
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

  // If the top score is high enough, return it as a match
  if (best.score > 0.5) {
    return {
      match: best,
      confidence: best.score,
      reason: "Highest ranking candidate selected based on RRF score.",
    };
  }

  return {
    match: null,
    confidence: best.score,
    reason:
      "Candidates are too low-confidence or ambiguous. Agent should consider creating a new IRI or refining the search.",
  };
}

/** DisambiguateEntitiesTool is a tool that helps an agent narrow down search results. */
export type DisambiguateEntitiesTool = Tool<
  DisambiguateEntitiesInput,
  DisambiguateEntitiesOutput
>;

/** disambiguateEntitiesTool defines the metadata for the entity disambiguation tool. */
export const disambiguateEntitiesTool = {
  name: "disambiguate_entities",
  description:
    "Selects the most likely match from a list of potential IRI candidates. Use this tool after a search returns multiple possible entities and you need a deterministic way to pick the correct one. Input must be a list of 'candidates' and the 'query' text. Returns the best matching entity or null.",
  inputSchema: disambiguateEntitiesInputSchema,
  outputSchema: disambiguateEntitiesOutputSchema,
};

/** createDisambiguateEntitiesTool instantiates the entity disambiguation tool. */
export function createDisambiguateEntitiesTool(
  {
    disambiguate = defaultDisambiguate,
  }: Partial<CreateToolsOptions> = {},
): DisambiguateEntitiesTool {
  return tool({
    ...disambiguateEntitiesTool,
    execute: async (input: DisambiguateEntitiesInput) => {
      return await disambiguate(input);
    },
  });
}
