import type { Quad } from "@rdfjs/types";
import { defaultGraph, namedNode, quad, type Quad_Object } from "oxigraph";
import type { HydratedStatement } from "#/core/database/statements.ts";
import { toTerm } from "./to-term.ts";

/**
 * toQuad converts a HydratedStatement to an RDF/JS Quad.
 *
 * This function reconstructs an RDF quad from the flat database representation,
 * handling term type conversion and blank node deskolemization.
 *
 * @param statement - The HydratedStatement to convert
 * @param skolemizedStatements - Additional statements needed for blank node reconstruction
 * @returns An RDF/JS Quad instance
 *
 * @example
 * ```ts
 * const statement: HydratedStatement = {
 *   subject: "http://example.com/subject",
 *   predicate: "http://example.com/predicate",
 *   object: "object value",
 *   graph: "",
 *   term_type: "Literal",
 *   object_language: "",
 *   object_datatype: ""
 * };
 * const quad = toQuad(statement, []);
 * // Returns: Quad with namedNode subject/predicate, literal object, defaultGraph
 * ```
 */
export function toQuad(
  statement: HydratedStatement,
  skolemizedStatements: HydratedStatement[],
): Quad {
  return quad(
    namedNode(statement.subject),
    namedNode(statement.predicate),
    toTerm(statement, skolemizedStatements) as Quad_Object,
    statement.graph ? namedNode(statement.graph) : defaultGraph(),
  );
}
