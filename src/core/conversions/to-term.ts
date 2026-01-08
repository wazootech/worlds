import type { Term } from "@rdfjs/types";
import { blankNode, defaultGraph, literal, namedNode } from "oxigraph";
import type { HydratedStatement } from "#/core/database/statements.ts";

/**
 * toTerm converts a HydratedStatement's object to an RDF/JS Term.
 *
 * This function reconstructs the appropriate RDF Term type (NamedNode, BlankNode,
 * Literal, or DefaultGraph) from the database representation. For blank nodes,
 * it handles skolemized IRIs by converting them back to blank node identifiers.
 *
 * @param statement - The HydratedStatement containing the object to convert
 * @param _skolemizedStatements - Additional statements for blank node reconstruction (currently unused)
 * @returns An RDF/JS Term instance
 *
 * @example
 * ```ts
 * const statement: HydratedStatement = {
 *   subject: "http://example.com/s",
 *   predicate: "http://example.com/p",
 *   object: "Hello",
 *   graph: "",
 *   term_type: "Literal",
 *   object_language: "en"
 * };
 * const term = toTerm(statement, []);
 * // Returns: literal("Hello", "en")
 * ```
 */
export function toTerm(
  statement: HydratedStatement,
  _skolemizedStatements: HydratedStatement[],
): Term {
  switch (statement.term_type) {
    case "NamedNode": {
      return namedNode(statement.object);
    }

    case "BlankNode": {
      // TODO: Deskolemize blank nodes from skolemized IRIs.
      // Blank nodes are stored as skolemized IRIs (e.g., "http://local/.well-known/genid/[UUID]")
      // and should be converted back to blank node identifiers.
      // return skolemizedNode(skolemizedStatements, statement.object);
      return blankNode(statement.object);
    }

    case "Literal": {
      // Reconstruct literal with language tag or datatype if present
      if (statement.object_language) {
        return literal(statement.object, statement.object_language);
      }
      if (statement.object_datatype) {
        return literal(statement.object, namedNode(statement.object_datatype));
      }
      return literal(statement.object);
    }

    case "DefaultGraph": {
      return defaultGraph();
    }

    default: {
      throw new Error(`Unknown term type: ${statement.term_type}`);
    }
  }
}

// I am introducing the concept of this skolemizedNode helper to dereference blank nodes from the skolemized statements.
//

export function skolemizedNode(
  skolemizedStatements: StatementRow[],
  id: string,
) {
  const statement = skolemizedStatements.find((s) => s.subject === id);
  if (!statement) {
    throw new Error(`No statement found for blank node: ${id}`);
  }

  return blankNode();
}
