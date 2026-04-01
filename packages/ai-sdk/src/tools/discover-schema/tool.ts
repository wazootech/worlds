import { tool } from "ai";
import type { Tool } from "ai";
import type { Worlds } from "@wazoo/worlds-sdk";
import type { CreateToolsOptions } from "../../options.ts";
import {
  discoverSchemaInputSchema,
  discoverSchemaOutputSchema,
} from "./schema.ts";
import type {
  DiscoverSchemaInput,
  DiscoverSchemaOutput,
  DiscoverSchemaResult,
} from "./schema.ts";

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
  worlds: Worlds,
  { source, referenceText, limit = 10 }: DiscoverSchemaInput,
): Promise<DiscoverSchemaOutput> {
  const searchResults = await worlds.search(source, referenceText, {
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
  const output = await worlds.sparql(
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

/**
 * DiscoverSchemaTool is a tool that discovers RDF classes and properties.
 */
export type DiscoverSchemaTool = Tool<
  DiscoverSchemaInput,
  DiscoverSchemaOutput
>;

/**
 * discoverSchemaTool is a metadata object for the tool that discovers RDF classes and properties.
 */
export const discoverSchemaTool = {
  name: "discover_schema",
  description:
    "Retrieves RDF classes and properties available in a world's schema. Use this tool when you need to understand the 'vocabulary' (what classes and properties exist) before inserting or querying data. Input must be a 'source' world ID and 'referenceText' describing what you're looking for. Returns an array of entity schemas.",
  inputSchema: discoverSchemaInputSchema,
  outputSchema: discoverSchemaOutputSchema,
};

/**
 * createDiscoverSchemaTool creates a tool that discovers RDF classes and properties.
 */
export function createDiscoverSchemaTool(
  options: CreateToolsOptions,
): DiscoverSchemaTool {
  return tool({
    ...discoverSchemaTool,
    execute: async (input: DiscoverSchemaInput) => {
      return await discoverSchema(options.worlds, input);
    },
  });
}
