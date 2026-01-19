import type { Quad, Store, Stream, Term } from "@rdfjs/types";
import DataFactory from "@rdfjs/data-model";
import { EventEmitter } from "node:events";
import { insertMultiple, removeMultiple } from "@orama/orama";
import { createInterceptorStore } from "#/rdfjs/stores/interceptor/interceptor-store.ts";
import type { FactOrama } from "./orama-search-engine.ts";
import { toOramaDocument, toOramaDocumentId } from "./to-orama-document.ts";

/**
 * syncOrama synchronizes an Orama search engine with an RDF/JS Store interceptor.
 */
export function syncOrama(orama: FactOrama, store: Store): Store {
  return createInterceptorStore(store, (event) => {
    switch (event.methodName) {
      case "import": {
        const [stream] = event.args;
        if (!stream) {
          return;
        }
        void collectQuadsFromStream(stream)
          .then((quads) => insertQuadsIntoOrama(orama, quads))
          .catch(reportSyncError);
        break;
      }

      case "remove": {
        const [stream] = event.args;
        if (!stream) {
          return;
        }
        void collectQuadsFromStream(stream)
          .then((quads) => removeQuadsFromOrama(orama, quads))
          .catch(reportSyncError);
        break;
      }

      case "removeMatches": {
        const [subject, predicate, object, graph] = event.args;
        const matchStream = store.match(subject, predicate, object, graph);
        void collectQuadsFromStream(matchStream)
          .then((quads) => removeQuadsFromOrama(orama, quads))
          .catch(reportSyncError);
        break;
      }

      case "deleteGraph": {
        const [graph] = event.args;
        const graphTerm = normalizeGraph(graph);
        const matchStream = store.match(null, null, null, graphTerm);
        void collectQuadsFromStream(matchStream)
          .then((quads) => removeQuadsFromOrama(orama, quads))
          .catch(reportSyncError);
        break;
      }

      default: {
        break;
      }
    }
  });
}

function collectQuadsFromStream(stream: Stream<Quad>): Promise<Quad[]> {
  return new Promise((resolve, reject) => {
    const emitter = stream as unknown as EventEmitter;
    const quads: Quad[] = [];

    const onData = (quad: Quad) => {
      quads.push(quad);
    };

    const cleanup = () => {
      emitter.off("data", onData);
      emitter.off("end", onEnd);
      emitter.off("error", onError);
    };

    const onEnd = () => {
      cleanup();
      resolve(quads);
    };

    const onError = (error: unknown) => {
      cleanup();
      reject(error);
    };

    emitter.on("data", onData);
    emitter.once("end", onEnd);
    emitter.once("error", onError);
  });
}

async function insertQuadsIntoOrama(orama: FactOrama, quads: Quad[]) {
  if (!quads.length) {
    return;
  }
  const documents = await Promise.all(
    quads.map(async (quad) => {
      const id = await toOramaDocumentId(quad);
      return toOramaDocument(id, quad);
    }),
  );
  await insertMultiple(orama, documents);
}

async function removeQuadsFromOrama(orama: FactOrama, quads: Quad[]) {
  if (!quads.length) {
    return;
  }
  const ids = await Promise.all(quads.map((quad) => toOramaDocumentId(quad)));
  const uniqueIds = Array.from(new Set(ids));
  if (!uniqueIds.length) {
    return;
  }
  await removeMultiple(orama, uniqueIds);
}

function normalizeGraph(
  graph: Quad["graph"] | string | undefined,
): Term | null | undefined {
  if (graph === undefined || graph === null) {
    return graph ?? undefined;
  }
  if (typeof graph === "string") {
    return DataFactory.namedNode(graph);
  }
  return graph;
}

function reportSyncError(error: unknown) {
  console.error("syncOrama error", error);
}

/**
 * insertStoreIntoOrama inserts all quads from an RDF/JS Store into an Orama fact store.
 * This is useful for initial synchronization when loading persisted data, where
 * the RDF store has data but Orama needs to be populated.
 */
export async function insertStoreIntoOrama(
  orama: FactOrama,
  store: Store,
): Promise<void> {
  // Get all quads from the store by matching everything (null matches all).
  const matchStream = store.match(null, null, null, null);
  const quads = await collectQuadsFromStream(matchStream);
  if (quads.length > 0) {
    await insertQuadsIntoOrama(orama, quads);
  }
}

/**
 * reifyQuad reifies a quad as a set of quads.
 */
function _reifyQuad(id: string, quad: Quad): Quad[] {
  return [
    DataFactory.quad(
      DataFactory.namedNode(id),
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#Statement",
      ),
    ),
    DataFactory.quad(
      DataFactory.namedNode(id),
      DataFactory.namedNode(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject",
      ),
      quad.subject,
    ),
    DataFactory.quad(
      DataFactory.namedNode(id),
      DataFactory.namedNode(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate",
      ),
      quad.predicate,
    ),
    DataFactory.quad(
      DataFactory.namedNode(id),
      DataFactory.namedNode(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#object",
      ),
      quad.object,
    ),
  ];
}
