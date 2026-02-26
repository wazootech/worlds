import { z } from "zod";
import type { WorldsSdk } from "@wazoo/worlds-sdk";
import { type EntitySchema, entitySchema } from "./schema.ts";

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
export type DiscoverSchemaResult = EntitySchema;

/**
 * discoverSchemaResultSchema is the schema for the discoverSchema tool.
 */
export const discoverSchemaResultSchema: z.ZodType<DiscoverSchemaResult> =
  entitySchema;

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
 * discoverSchema discovers classes and properties.
 */
export async function discoverSchema(
  sdk: WorldsSdk,
  { source, referenceText, limit = 10 }: DiscoverSchemaInput,
): Promise<DiscoverSchemaOutput> {
  const searchResults = await sdk.worlds.search(source, referenceText, {
    limit: limit * 5, // Fetch more candidates to ensure we get enough unique subjects
    types: [
      terms.rdfs.Class,
      terms.owl.Class,
      terms.rdf.Property,
      terms.owl.ObjectProperty,
      terms.owl.DatatypeProperty,
    ],
  });

  const subjects = new Set<string>();
  for (const result of searchResults) {
    subjects.add(result.subject);
    if (subjects.size >= limit) {
      break;
    }
  }

  const subjectsArray = Array.from(subjects);
  if (subjectsArray.length === 0) {
    return { results: [] };
  }

  // Batch hydrate with one SPARQL query
  const subjectsValues = subjectsArray.map((s) => `<${s}>`).join(" ");
  const output = await sdk.worlds.sparql(
    source,
    `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    
    SELECT ?s ?p ?o WHERE {
      VALUES ?s { ${subjectsValues} }
      { ?s ?p ?o . }
      UNION
      { ?s rdfs:subClassOf* ?parent . ?parent ?p ?o . }
      UNION
      { ?s owl:equivalentClass ?equiv . ?equiv ?p ?o . }
    }
  `,
  );

  const results: DiscoverSchemaResult[] = [];
  if (!output || !output.results || !("bindings" in output.results)) {
    return { results };
  }

  const subjectMap = new Map<string, {
    label?: string;
    description?: string;
    type?: "Class" | "Property";
    domains: Set<string>;
    ranges: Set<string>;
  }>();

  for (const binding of output.results.bindings) {
    // Ensure it's a SELECT result with bindings (not quads) and has s, p, o
    if (!binding.s || !binding.p || !binding.o) {
      continue;
    }

    // Skip RDF-star triple terms for schema discovery.
    if (binding.p.type === "triple" || binding.o.type === "triple") {
      continue;
    }

    const s = binding.s.value as string;
    const p = binding.p.value as string;
    const o = binding.o.value as string;

    let data = subjectMap.get(s);
    if (!data) {
      data = { domains: new Set(), ranges: new Set() };
      subjectMap.set(s, data);
    }

    if (p === terms.rdfs.label || p === terms.skos.prefLabel) {
      data.label = o;
    } else if (
      p === terms.rdfs.comment || p === terms.skos.definition
    ) {
      data.description = o;
    } else if (p === terms.rdf.type) {
      if (o === terms.rdfs.Class || o === terms.owl.Class) {
        data.type = "Class";
      } else if (
        o === terms.rdf.Property ||
        o === terms.owl.ObjectProperty ||
        o === terms.owl.DatatypeProperty
      ) {
        data.type = "Property";
      }
    } else if (p === terms.rdfs.subClassOf) {
      data.type = "Class";
    } else if (p === terms.rdfs.domain) {
      data.domains.add(o);
    } else if (p === terms.rdfs.range) {
      data.ranges.add(o);
    }
  }

  for (const [iri, data] of subjectMap.entries()) {
    if (data.type === "Class") {
      results.push({
        iri,
        label: data.label,
        description: data.description,
        type: "Class",
      });
    } else if (data.type === "Property") {
      results.push({
        iri,
        label: data.label,
        description: data.description,
        type: "Property",
        domain: Array.from(data.domains),
        range: Array.from(data.ranges),
      });
    }
  }

  return {
    results,
  };
}
