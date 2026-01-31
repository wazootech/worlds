import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import type { PatchHandler } from "@fartlabs/search-store";
import { connectSearchStoreToN3Store } from "@fartlabs/search-store/n3";
import { generateBlobFromN3Store, generateN3StoreFromBlob } from "./n3.ts";
import type { SparqlBinding, SparqlQuad, SparqlResult } from "#/sdk/types.ts";

/**
 * DatasetParams are the parameters for a SPARQL query.
 */
export interface DatasetParams {
  defaultGraphUris: string[];
  namedGraphUris: string[];
}

/**
 * NoopPatchHandler is a PatchHandler that does nothing.
 */
export class NoopPatchHandler implements PatchHandler {
  patch() {
    return Promise.resolve();
  }
}

/**
 * sparql executes a SPARQL query and returns the result.
 */
export async function sparql(
  blob: Blob,
  query: string,
  searchStore: PatchHandler = new NoopPatchHandler(),
): Promise<{ blob: Blob; result: SparqlResult | null }> {
  const store = await generateN3StoreFromBlob(blob);
  const { store: proxiedStore, sync } = connectSearchStoreToN3Store(
    searchStore,
    store,
  );

  const queryEngine = new QueryEngine();
  const queryType = await queryEngine.query(query, { sources: [proxiedStore] });

  // If the query is an update, we need to execute it and then sync the search store.
  if (queryType.resultType === "void") {
    await queryType.execute();
    await sync();
    const newBlob = await generateBlobFromN3Store(store);
    return { blob: newBlob, result: null };
  }

  if (queryType.resultType === "bindings") {
    const result = await handleBindings(queryType);
    return { blob, result };
  }

  if (queryType.resultType === "boolean") {
    const result = await handleBoolean(queryType);
    return { blob, result };
  }

  if (queryType.resultType === "quads") {
    const result = await handleQuads(queryType);
    return { blob, result };
  }

  throw new Error("Unsupported query type");
}

// deno-lint-ignore no-explicit-any
async function handleBindings(queryType: any): Promise<SparqlResult> {
  const bindingsStream = await queryType.execute();
  // deno-lint-ignore no-explicit-any
  const vars = (await queryType.metadata()).variables.map((v: any) => v.value);
  const bindings = await new Promise<SparqlBinding[]>(
    (resolve, reject) => {
      const b: SparqlBinding[] = [];
      // deno-lint-ignore no-explicit-any
      bindingsStream.on("data", (binding: any) => {
        const bindingObj: SparqlBinding = {};
        for (const v of vars) {
          const term = binding.get(v);
          if (term) {
            let type = "literal";
            if (term.termType === "NamedNode") type = "uri";
            else if (term.termType === "BlankNode") type = "bnode";

            bindingObj[v] = {
              type: type as "uri" | "literal" | "bnode",
              value: term.value,
            };

            if (term.termType === "Literal") {
              if (term.language) {
                bindingObj[v]["xml:lang"] = term.language;
              }
              if (
                term.datatype &&
                term.datatype.value !==
                  "http://www.w3.org/2001/XMLSchema#string"
              ) {
                bindingObj[v].datatype = term.datatype.value;
              }
            }
          }
        }
        b.push(bindingObj);
      });
      bindingsStream.on("end", () => resolve(b));
      bindingsStream.on("error", reject);
    },
  );

  return {
    head: { vars },
    results: { bindings },
  };
}

// deno-lint-ignore no-explicit-any
async function handleBoolean(queryType: any): Promise<SparqlResult> {
  const booleanResult = await queryType.execute();
  return {
    head: {},
    boolean: booleanResult,
  };
}

// deno-lint-ignore no-explicit-any
async function handleQuads(queryType: any): Promise<SparqlResult> {
  const quadsStream = await queryType.execute();
  const quads = await new Promise<SparqlQuad[]>((resolve, reject) => {
    const q: SparqlQuad[] = [];
    // deno-lint-ignore no-explicit-any
    quadsStream.on("data", (quad: any) => {
      q.push({
        subject: {
          type: quad.subject.termType === "NamedNode" ? "uri" : "bnode",
          value: quad.subject.value,
        },
        predicate: {
          type: "uri",
          value: quad.predicate.value,
        },
        object: {
          type: quad.object.termType === "NamedNode"
            ? "uri"
            : quad.object.termType === "BlankNode"
            ? "bnode"
            : "literal",
          value: quad.object.value,
          ...(quad.object.language ? { "xml:lang": quad.object.language } : {}),
          ...(quad.object.datatype &&
              quad.object.datatype.value !==
                "http://www.w3.org/2001/XMLSchema#string"
            ? { datatype: quad.object.datatype.value }
            : {}),
        },
        graph: {
          type: quad.graph.termType === "DefaultGraph" ? "default" : "uri",
          value: quad.graph.value,
        },
      });
    });
    quadsStream.on("end", () => resolve(q));
    quadsStream.on("error", reject);
  });

  return {
    head: {},
    results: { quads },
  };
}
