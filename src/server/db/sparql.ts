import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import type { PatchHandler } from "@fartlabs/search-store";
import { connectSearchStoreToN3Store } from "@fartlabs/search-store/n3";
import { generateBlobFromN3Store, generateN3StoreFromBlob } from "./n3.ts";

/**
 * DatasetParams are the parameters for a SPARQL query.
 */
export interface DatasetParams {
  defaultGraphUris: string[];
  namedGraphUris: string[];
}

/**
 * SparqlResult represents the result of a SPARQL query.
 *
 * It is a JSON object conforming to the SPARQL 1.1 Query Results JSON Format.
 */
// deno-lint-ignore no-explicit-any
export type SparqlResult = any;

/**
 * sparql executes a SPARQL query and returns the result.
 */
export async function sparql(
  blob: Blob,
  query: string,
  searchStore: PatchHandler = { patch: async () => {} },
): Promise<{ blob: Blob; result: SparqlResult }> {
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

  // Boolean result
  if (queryType.resultType === "boolean") {
    const result = await handleBoolean(queryType);
    return { blob, result };
  }

  throw new Error("Unsupported query type");
}

// deno-lint-ignore no-explicit-any
async function handleBindings(queryType: any): Promise<SparqlResult> {
  const bindingsStream = await queryType.execute();
  // deno-lint-ignore no-explicit-any
  const vars = (await queryType.metadata()).variables.map((v: any) => v.value);
  const bindings = await new Promise<Record<string, unknown>[]>(
    (resolve, reject) => {
      const b: Record<string, unknown>[] = [];
      // deno-lint-ignore no-explicit-any
      bindingsStream.on("data", (binding: any) => {
        const bindingObj: Record<string, unknown> = {};
        for (const v of vars) {
          const term = binding.get(v);
          if (term) {
            let type = "literal";
            if (term.termType === "NamedNode") type = "uri";
            else if (term.termType === "BlankNode") type = "bnode";

            bindingObj[v] = {
              type,
              value: term.value,
            };

            if (term.termType === "Literal") {
              if (term.language) {
                bindingObj[v] = {
                  ...bindingObj[v] as Record<string, unknown>,
                  "xml:lang": term.language,
                };
              }
              if (
                term.datatype &&
                term.datatype.value !==
                  "http://www.w3.org/2001/XMLSchema#string"
              ) {
                bindingObj[v] = {
                  ...bindingObj[v] as Record<string, unknown>,
                  datatype: term.datatype.value,
                };
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
