import {
  type BlankNode,
  blankNode,
  defaultGraph,
  type Literal,
  literal,
  type NamedNode,
  namedNode,
  type Quad,
  quad,
  type Term,
} from "oxigraph";
import type { StatementRow } from "./database/statements.ts";

/**
 * fromQuad converts a Quad to a StatementRow.
 */
export function fromQuad(quad: Quad): StatementRow {
  return {
    statement_id: -1, // Placeholder
    subject: quad.subject.value,
    predicate: quad.predicate.value,
    object: quad.object.value,
    graph: quad.graph.value,
    term_type: quad.object.termType as
      | "NamedNode"
      | "BlankNode"
      | "Literal"
      | "DefaultGraph",
    object_language: (quad.object as { language?: string }).language || "",
    object_datatype: (quad.object as { datatype?: { value: string } }).datatype
      ?.value || "",
  };
}

/**
 * toQuad converts a StatementRow to a Quad.
 */
export function toQuad(statement: StatementRow): Quad {
  let objectTerm: NamedNode | BlankNode | Literal;

  if (statement.term_type === "Literal") {
    objectTerm = literal(
      statement.object,
      statement.object_language ||
        (statement.object_datatype
          ? namedNode(statement.object_datatype)
          : undefined),
    );
  } else if (statement.term_type === "BlankNode") {
    objectTerm = blankNode(statement.object);
  } else {
    // Default to NamedNode
    // Note: DefaultGraph is not a valid object term type in standard RDF Quads.
    objectTerm = namedNode(statement.object);
  }

  // Subject is always a NamedNode in our system (Skolemized)
  // But we strictly create a NamedNode to be safe.
  const subjectTerm = namedNode(statement.subject);

  const graphTerm = statement.graph
    ? namedNode(statement.graph)
    : defaultGraph();

  return quad(
    subjectTerm,
    namedNode(statement.predicate),
    objectTerm,
    graphTerm,
  );
}
