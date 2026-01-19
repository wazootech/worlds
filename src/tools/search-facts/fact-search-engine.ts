import { z } from "zod";

/**
 * FactSearchEngine searches for facts and returns the structured result.
 */
export interface FactSearchEngine {
  searchFacts: (query: string, limit: number) => Promise<SearchFactsOutput>;
}

/**
 * SearchFactsInput represents a search for facts input.
 */
export type SearchFactsInput = z.infer<typeof searchFactsInputSchema>;

export const searchFactsInputSchema = z.object({
  query: z.string().describe(
    "A text query to search for facts. Can be an entity name, description, or any text that might match facts in the knowledge base. Examples: 'Ethan', 'Nancy', 'meeting at cafe', 'person named John'.",
  ),
  limit: z.number().min(1).max(100).optional().describe(
    "Maximum number of facts to return (default: 10). Use lower limits for focused searches, higher limits when exploring broadly.",
  ),
});

/**
 * SearchFactsOutput represents a search for facts output.
 */
export type SearchFactsOutput = z.infer<typeof searchFactsOutputSchema>;

export const searchFactsOutputSchema = z.array(z.object({
  subject: z.string().describe(
    "The IRI of the subject in the matching fact. Use this IRI when referencing this entity in SPARQL queries.",
  ),
  predicate: z.string().describe(
    "The IRI of the predicate (property) in the matching fact.",
  ),
  object: z.string().describe(
    "The object value in the matching fact (can be an IRI or literal value).",
  ),
  score: z.number().describe(
    "Relevance score (0-1, higher is more relevant). Use this to prioritize which facts are most likely to match your search intent.",
  ),
}));
