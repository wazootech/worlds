import type { Quad } from "@rdfjs/types";
import type { HydratedStatement } from "#/core/database/statements.ts";
import { fromTerm } from "./from-term.ts";

/**
 * fromQuad converts an RDF/JS Quad to a HydratedStatement.
 *
 * This function extracts the string values from the Quad's terms and
 * constructs a flat representation suitable for database storage.
 *
 * @param quad - The RDF/JS Quad to convert
 * @returns A HydratedStatement with string values for all components
 *
 * @example
 * ```ts
 * const quad = quad(
 *   namedNode("http://example.com/subject"),
 *   namedNode("http://example.com/predicate"),
 *   literal("object value"),
 *   defaultGraph()
 * );
 * const statement = fromQuad(quad);
 * // Returns: {
 * //   subject: "http://example.com/subject",
 * //   predicate: "http://example.com/predicate",
 * //   object: "object value",
 * //   graph: "",
 * //   term_type: "Literal",
 * //   object_language: "",
 * //   object_datatype: ""
 * // }
 * ```
 */
export function fromQuad(quad: Quad): HydratedStatement {
  const objectTerm = fromTerm(quad.object);

  return {
    subject: quad.subject.value,
    predicate: quad.predicate.value,
    object: objectTerm.value,
    graph: quad.graph.termType === "DefaultGraph" ? "" : quad.graph.value,
    term_type: quad.object.termType as
      | "NamedNode"
      | "BlankNode"
      | "Literal"
      | "DefaultGraph",
    object_language: objectTerm.language || "",
    object_datatype: objectTerm.datatype || "",
  };
}
