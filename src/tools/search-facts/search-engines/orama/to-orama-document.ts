import type { Quad } from "@rdfjs/types";
import { skolemizeQuad } from "#/rdfjs/canon/rdfc-1-0.ts";

/**
 * toOramaDocumentId converts an RDF/JS Quad to an Orama document ID.
 */
export async function toOramaDocumentId(quad: Quad): Promise<string> {
  const skolemized = await skolemizeQuad(quad);
  return `https://orama.fartlabs.org/.well-known/genid/${skolemized}`;
}

/**
 * toOramaDocument converts an RDF/JS Quad to an Orama document.
 */
export function toOramaDocument(id: string, quad: Quad) {
  return {
    id,
    subject: quad.subject.value,
    predicate: quad.predicate.value,
    object: quad.object.value,
    graph: quad.graph.value,
  };
}
