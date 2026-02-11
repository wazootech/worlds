import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { WorldsSdk } from "@wazoo/sdk";
import type { CreateToolsOptions } from "#/options.ts";

/**
 * DiscoverSchemaInput is the input to the discoverSchema tool.
 */
export interface DiscoverSchemaInput {
  source: string;
  referenceText: string;
  limit?: number;
}

/**
 * discoverSchemaInputSchema is the input schema for the discoverSchema tool.
 */
export const discoverSchemaInputSchema: z.ZodType<DiscoverSchemaInput> = z
  .object({
    source: z.string().describe(
      "The ID of the schema source to discover concepts from.",
    ),
    referenceText: z.string().describe(
      "A natural language description of the entities or properties to discover (e.g., 'A person with a name').",
    ),
    limit: z.number().min(1).max(100).optional().describe(
      "Maximum number of unique subjects to return (default: 10).",
    ),
  });

/**
 * DiscoverSchemaResult is a result of the discoverSchema tool.
 */
export type DiscoverSchemaResult =
  | {
    type: "Class";
    iri: string;
    label?: string;
    description?: string;
  }
  | {
    type: "Property";
    iri: string;
    domain: string[];
    range: string[];
    label?: string;
    description?: string;
  };

/**
 * discoverSchemaResultSchema is the schema for the discoverSchema tool.
 */
export const discoverSchemaResultSchema: z.ZodType<DiscoverSchemaResult> = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("Class"),
      iri: z.string(),
      label: z.string().optional(),
      description: z.string().optional(),
    }),
    z.object({
      type: z.literal("Property"),
      iri: z.string(),
      label: z.string().optional(),
      description: z.string().optional(),
      domain: z.array(z.string()),
      range: z.array(z.string()),
    }),
  ]);

/**
 * DiscoverSchemaOutput is the output of the discoverSchema tool.
 */
export interface DiscoverSchemaOutput {
  results: DiscoverSchemaResult[];
}

/**
 * discoverSchemaOutputSchema is the output schema for the discoverSchema tool.
 */
export const discoverSchemaOutputSchema: z.ZodType<DiscoverSchemaOutput> = z
  .object({
    results: z.array(discoverSchemaResultSchema),
  });

const terms = {
  rdf: {
    type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    Property: "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
  },
  rdfs: {
    label: "http://www.w3.org/2000/01/rdf-schema#label",
    comment: "http://www.w3.org/2000/01/rdf-schema#comment",
    subClassOf: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
    domain: "http://www.w3.org/2000/01/rdf-schema#domain",
    range: "http://www.w3.org/2000/01/rdf-schema#range",
    Class: "http://www.w3.org/2000/01/rdf-schema#Class",
  },
  owl: {
    Class: "http://www.w3.org/2002/07/owl#Class",
    ObjectProperty: "http://www.w3.org/2002/07/owl#ObjectProperty",
    DatatypeProperty: "http://www.w3.org/2002/07/owl#DatatypeProperty",
  },
  skos: {
    prefLabel: "http://www.w3.org/2004/02/skos/core#prefLabel",
    definition: "http://www.w3.org/2004/02/skos/core#definition",
  },
};

/**
 * DiscoverSchemaTool is a tool that discovers RDF classes and properties.
 */
export type DiscoverSchemaTool = Tool<
  DiscoverSchemaInput,
  DiscoverSchemaOutput
>;

/**
 * createDiscoverSchemaTool creates a tool that discovers RDF classes and properties.
 */
export function createDiscoverSchemaTool(
  options: CreateToolsOptions,
): DiscoverSchemaTool {
  return tool({
    description:
      "Discover the available classes and properties (vocabulary) in the knowledge base schema.",
    inputSchema: discoverSchemaInputSchema,
    outputSchema: discoverSchemaOutputSchema,
    execute: async (input) => {
      return await discoverSchema(options.sdk, input);
    },
  });
}

/**
 * discoverSchema discovers classes and properties.
 */
export async function discoverSchema(
  sdk: WorldsSdk,
  { source, referenceText, limit = 10 }: DiscoverSchemaInput,
): Promise<DiscoverSchemaOutput> {
  const searchResults = await sdk.worlds.search(source, referenceText, {
    limit,
  });

  const subjects = new Set<string>();
  for (const result of searchResults) {
    subjects.add(result.subject);
    if (subjects.size >= limit) {
      break;
    }
  }

  const results: DiscoverSchemaResult[] = [];

  await Promise.all(
    Array.from(subjects).map(async (iri) => {
      try {
        const output = await sdk.worlds.sparql(
          source,
          `
          PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
          PREFIX owl: <http://www.w3.org/2002/07/owl#>
          
          SELECT ?p ?o WHERE {
            { <${iri}> ?p ?o . }
            UNION
            { <${iri}> rdfs:subClassOf* ?parent . ?parent ?p ?o . }
            UNION
            { <${iri}> owl:equivalentClass ?equiv . ?equiv ?p ?o . }
          }
        `,
        );
        if (!output || !output.results) {
          return;
        }

        // Ensure it's a SELECT result with bindings (not quads)
        if (!("bindings" in output.results)) {
          return;
        }

        let label: string | undefined;
        let description: string | undefined;
        let type: "Class" | "Property" | undefined;
        const domains = new Set<string>();
        const ranges = new Set<string>();

        for (const binding of output.results.bindings) {
          const p = binding.p.value;
          const o = binding.o.value;

          if (p === terms.rdfs.label || p === terms.skos.prefLabel) {
            label = o;
          } else if (
            p === terms.rdfs.comment || p === terms.skos.definition
          ) {
            description = o;
          } else if (p === terms.rdf.type) {
            if (o === terms.rdfs.Class || o === terms.owl.Class) {
              type = "Class";
            } else if (
              o === terms.rdf.Property ||
              o === terms.owl.ObjectProperty ||
              o === terms.owl.DatatypeProperty
            ) {
              type = "Property";
            }
          } else if (p === terms.rdfs.subClassOf) {
            type = "Class";
          } else if (p === terms.rdfs.domain) {
            domains.add(o);
          } else if (p === terms.rdfs.range) {
            ranges.add(o);
          }
        }

        if (type === "Class") {
          results.push({
            iri,
            label,
            description,
            type: "Class",
          });
        } else if (type === "Property") {
          results.push({
            iri,
            label,
            description,
            type: "Property",
            domain: Array.from(domains),
            range: Array.from(ranges),
          });
        }
      } catch (e) {
        console.warn(`Failed to hydrate result ${iri}:`, e);
        // Optionally include partial info from search result?
        // For now, allow skipping if SPARQL fails (e.g., restricted access).
      }
    }),
  );

  return {
    results,
  };
}
