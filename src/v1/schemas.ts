import { z } from "zod/v4";

// --- Term Schemas ---

export const v1NamedNodeSchema = z.object({
  termType: z.literal("NamedNode"),
  value: z.string(),
}).describe("RDF/JS NamedNode");

export const v1BlankNodeSchema = z.object({
  termType: z.literal("BlankNode"),
  value: z.string(),
}).describe("RDF/JS BlankNode");

export const v1DefaultGraphSchema = z.object({
  termType: z.literal("DefaultGraph"),
  value: z.literal(""),
}).describe("RDF/JS DefaultGraph");

export const v1VariableSchema = z.object({
  termType: z.literal("Variable"),
  value: z.string(),
}).describe("RDF/JS Variable");

export const v1LiteralSchema = z.object({
  termType: z.literal("Literal"),
  value: z.string(),
  language: z.string(),
  datatype: v1NamedNodeSchema,
  direction: z.enum(["ltr", "rtl", ""]).optional(),
}).describe("RDF/JS Literal");

// --- Quad Schema ---

export const v1QuadSchema = z.object({
  termType: z.literal("Quad"),
  value: z.literal(""),
  subject: z.union([
    v1NamedNodeSchema,
    v1BlankNodeSchema,
    v1VariableSchema,
  ]),
  predicate: z.union([
    v1NamedNodeSchema,
    v1VariableSchema,
  ]),
  object: z.union([
    v1NamedNodeSchema,
    v1LiteralSchema,
    v1BlankNodeSchema,
    v1VariableSchema,
  ]),
  graph: z.union([
    v1DefaultGraphSchema,
    v1NamedNodeSchema,
    v1BlankNodeSchema,
    v1VariableSchema,
  ]),
}).describe("RDF/JS Quad");

// --- Term Schema ---

export const v1TermSchema = z.union([
  v1NamedNodeSchema,
  v1BlankNodeSchema,
  v1LiteralSchema,
  v1VariableSchema,
  v1DefaultGraphSchema,
  v1QuadSchema,
]).describe("RDF/JS Term");

// --- API Schemas ---

export const v1SparqlBindingsSchema = z.record(
  z.string(),
  v1TermSchema.optional(),
);

export const v1SparqlQueryResultsSchema = z.union([
  z.string().describe("Result for DESCRIBE queries"),
  z.boolean().describe("Result for ASK queries"),
  z.array(v1SparqlBindingsSchema).describe("Result for SELECT queries"),
  z.array(v1QuadSchema).describe("Result for CONSTRUCT queries"),
]).describe(
  "The query result: string, boolean, bindings array, or quad array.",
);
