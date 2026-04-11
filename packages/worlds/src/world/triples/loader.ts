import type { Client } from "@libsql/client";
import { DataFactory, Store, type Quad } from "n3";
import { skolemizeQuad } from "#/rdf/patch/skolem.ts";
import { TriplesRepository } from "./repository.ts";
import type { PatchHandler } from "#/rdf/patch/types.ts";
import type { TripleTableUpsert } from "./schema.ts";

const { namedNode, defaultGraph, quad } = DataFactory;

const DEFAULT_GRAPH = "<default>";
const MAX_TRIPLES = 100_000;

/**
 * TriplesPatchHandler syncs RDF patches to the triples table.
 * Uses skolemizeQuad for consistent hashing with handlePatch.
 */
export class TriplesPatchHandler implements PatchHandler {
  private repository: TriplesRepository;

  constructor(db: Client) {
    this.repository = new TriplesRepository(db);
  }

  async patch(patches: { insertions: Quad[]; deletions: Quad[] }[]): Promise<void> {
    for (const patch of patches) {
      for (const quad of patch.deletions) {
        const id = await skolemizeQuad(quad);
        await this.repository.delete(id);
      }

      for (const quad of patch.insertions) {
        const tableTriple = this.quadToTableTriple(quad);
        const id = await skolemizeQuad(quad);
        await this.repository.upsert({ ...tableTriple, id });
      }
    }
  }

  private quadToTableTriple(q: Quad): TripleTableUpsert {
    const graph = q.graph.termType === "DefaultGraph"
      ? DEFAULT_GRAPH
      : q.graph.value;

    return {
      id: "",
      subject: q.subject.value,
      predicate: q.predicate.value,
      object: q.object.value,
      graph,
    };
  }
}

/**
 * loadStore loads all triples from the database into an N3 Store.
 * Recommended max: 100K triples for in-memory N3 Store loading.
 * @param db The database client.
 * @returns An N3 Store with all triples loaded.
 * @throws Error if the world exceeds the recommended max of 100K triples.
 */
export async function loadStore(db: Client): Promise<Store> {
  const repository = new TriplesRepository(db);
  const triples = await repository.getAll();

  if (triples.length > MAX_TRIPLES) {
    throw new Error(
      `World exceeds recommended max of ${MAX_TRIPLES} triples (found ${triples.length}). ` +
      `Lazy loading for large worlds is not yet supported.`,
    );
  }

  const store = new Store();

  for (const triple of triples) {
    const subject = triple.subject.startsWith("_:")
      ? DataFactory.blankNode(triple.subject.slice(2))
      : namedNode(triple.subject);
    const predicate = namedNode(triple.predicate);
    let object;
    if (triple.object.startsWith("_:")) {
      object = DataFactory.blankNode(triple.object.slice(2));
    } else if (
      triple.object.startsWith("http://") ||
      triple.object.startsWith("https://") ||
      triple.object.startsWith("urn:")
    ) {
      object = namedNode(triple.object);
    } else {
      object = DataFactory.literal(triple.object);
    }
    const graph = triple.graph === DEFAULT_GRAPH
      ? defaultGraph()
      : namedNode(triple.graph);

    store.addQuad(quad(subject, predicate, object, graph));
  }

  return store;
}