import type { Quad, Term } from "oxigraph";

/**
 * serializeSparqlResult converts a raw Oxigraph query result into a JSON-serializable format.
 * - SELECT results (Map[]) -> Array of POJOs
 * - CONSTRUCT results (Quad[]) -> Array of POJO Quads
 * - Boolean/String -> returned as is
 */
export function serializeSparqlResult(
  result: boolean | Map<string, Term>[] | Quad[] | string,
): unknown {
  if (Array.isArray(result)) {
    if (result.length === 0) return [];

    // Handle SELECT results (Map<string, Term>[])
    if (result[0] instanceof Map) {
      return (result as Map<string, Term>[]).map((bindings) => {
        return Object.fromEntries(
          bindings.entries().map(([key, value]) => [key, serializeTerm(value)]),
        );
      });
    }

    // Handle CONSTRUCT/DESCRIBE results (Quad[])
    return (result as Quad[]).map((quad) => ({
      termType: "Quad",
      value: "",
      subject: serializeTerm(quad.subject),
      predicate: serializeTerm(quad.predicate),
      object: serializeTerm(quad.object),
      graph: serializeTerm(quad.graph),
    }));
  }

  return result;
}

/**
 * serializeTerm converts an Oxigraph Term into a POJO.
 */
export function serializeTerm(term: Term): unknown {
  const result: Record<string, unknown> = {
    termType: term.termType,
    value: term.value,
  };
  if (term.termType === "Literal") {
    result.language = term.language;
    if (term.datatype) {
      result.datatype = {
        termType: term.datatype.termType,
        value: term.datatype.value,
      };
    }
  }
  return result;
}
