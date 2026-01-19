import type { SparqlEngine } from "#/sparql-engine/sparql-engine.ts";
import { createQuerySparqlTool } from "#/tools/query-sparql/tool.ts";
import { createUpdateSparqlTool } from "#/tools/update-sparql/tool.ts";
import type { FactSearchEngine } from "#/tools/search-facts/fact-search-engine.ts";
import { createSearchFactsTool } from "#/tools/search-facts/tool.ts";
import type { IriGenerator } from "#/tools/generate-iri/iri-generator.ts";
import { createGenerateIriTool } from "#/tools/generate-iri/tool.ts";

export interface SparqlOptions {
  sparqlEngine: SparqlEngine;
  searchEngine: FactSearchEngine;
  iriGenerator: IriGenerator;
}

export function createSparqlTools(options: SparqlOptions) {
  return {
    query_sparql: createQuerySparqlTool(options.sparqlEngine),
    update_sparql: createUpdateSparqlTool(options.sparqlEngine),
    search_facts: createSearchFactsTool(options.searchEngine),
    generate_iri: createGenerateIriTool(options.iriGenerator),
  };
}

export interface SparqlPromptContext {
  userIri: string;
  assistantIri: string;
  formatDate: () => string;
}

export function formatSparqlPrompt(
  prompt: string,
  context?: SparqlPromptContext,
) {
  const parts: string[] = [];
  if (context?.userIri) {
    parts.push(
      `The user's IRI is <${context.userIri}>. When the prompt references the user (explicitly or implicitly through first-person pronouns such as "me", "I", "we", etc.), use this IRI.`,
    );
  }

  if (context?.assistantIri) {
    parts.push(
      `The assistant's IRI is <${context.assistantIri}>. When the prompt references the assistant (explicitly or implicitly through second-person pronouns), use this IRI.`,
    );
  }

  if (context?.formatDate) {
    parts.push(
      `The time of writing is ${context.formatDate()}.`,
    );
  }

  parts.push(`Generate a SPARQL query for: ${prompt}`);
  return parts.join(" ");
}
