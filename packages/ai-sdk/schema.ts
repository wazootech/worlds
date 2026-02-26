import { z } from "zod";
import type { Source } from "@wazoo/worlds-sdk";

export type { Source };

/**
 * sourceSchema is the Zod schema for a source.
 */
export const sourceSchema: z.ZodType<Source> = z.object({
  id: z.string().describe("The ID of the source."),
  writable: z.boolean().optional().describe("Whether the source is writable."),
  schema: z.boolean().optional().describe(
    "Whether the source is a schema source.",
  ),
});

/**
 * EntitySchema represents a class or property in the ontology.
 */
export type EntitySchema =
  | {
    type: "Class";
    iri: string;
    label?: string;
    description?: string;
  }
  | {
    type: "Property";
    iri: string;
    domain?: string[];
    range?: string[];
    label?: string;
    description?: string;
  };

/**
 * entitySchema is the Zod schema for an EntitySchema.
 */
export const entitySchema: z.ZodType<EntitySchema> = z.union([
  z.object({
    type: z.literal("Class"),
    iri: z.string().describe("The IRI of the class."),
    label: z.string().optional().describe(
      "A human-readable label for the class.",
    ),
    description: z.string().optional().describe("A description of the class."),
  }),
  z.object({
    type: z.literal("Property"),
    iri: z.string().describe("The IRI of the property."),
    domain: z.array(z.string()).optional().describe("Allowed domain IRIs."),
    range: z.array(z.string()).optional().describe("Allowed range IRIs."),
    label: z.string().optional().describe(
      "A human-readable label for the property.",
    ),
    description: z.string().optional().describe(
      "A description of the property.",
    ),
  }),
]);

/**
 * Ontology represents a collection of class and property definitions.
 */
export interface Ontology {
  classes: string[];
  properties: string[];
  shacl?: string;
  definitions?: EntitySchema[];
}

/**
 * ontologySchema is the Zod schema for an Ontology.
 */
export const ontologySchema: z.ZodType<Ontology> = z.object({
  classes: z.array(z.string()).describe("A list of allowed class IRIs."),
  properties: z.array(z.string()).describe("A list of allowed property IRIs."),
  shacl: z.string().optional().describe(
    "Optional SHACL shapes (Turtle) to validate triples against.",
  ),
  definitions: z.array(entitySchema).optional().describe(
    "Detailed definitions of entities.",
  ),
});
