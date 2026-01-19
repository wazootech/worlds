import { tool } from "ai";
import { z } from "zod";
import type { FactSearchEngine } from "./fact-search-engine.ts";

export function createSearchFactsTool(searchEngine: FactSearchEngine) {
  return tool({
    description:
      "Search for facts in the knowledge base using full-text and vector search. Use this to find entities when you don't know their exact IRI or to explore broad topics.",
    inputSchema: z.object({
      query: z.string().describe(
        "A text query to search for facts. Can be an entity name, description, or any text that might match facts in the knowledge base. Examples: 'Ethan', 'Nancy', 'meeting at cafe', 'person named John'.",
      ),
      limit: z.number().min(1).max(100).optional().describe(
        "Maximum number of facts to return (default: 10). Use lower limits for focused searches, higher limits when exploring broadly.",
      ),
    }),
    execute: async ({ query, limit }) => {
      return await searchEngine.searchFacts(query, limit ?? 10);
    },
  });
}
