import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import { getWorldAsN3Store, setWorldAsN3Store } from "./n3.ts";

/**
 * DatasetParams are the parameters for a SPARQL query.
 */
export interface DatasetParams {
  defaultGraphUris: string[];
  namedGraphUris: string[];
}

/**
 * sparql executes a SPARQL query and returns the result.
 */
export async function sparql(
  kv: Deno.Kv,
  worldId: string,
  query: string,
): Promise<Response> {
  const store = await getWorldAsN3Store(kv, worldId);

  const queryEngine = new QueryEngine();
  const queryType = await queryEngine.query(query, { sources: [store] });

  if (queryType.resultType === "void") {
    await queryType.execute();
    await setWorldAsN3Store(kv, worldId, store);
    // TODO: Forward changes to search index.
    return new Response(null, { status: 204 });
  }

  // TODO: Leverage existing, battle-tested SPARQL JSON serializer.
  // https://comunica.dev/docs/query/advanced/result_formats/
  // https://comunica.dev/docs/query/getting_started/query_app/#8--serializing-to-a-specific-result-format
  //

  if (queryType.resultType === "bindings") {
    return await handleBindings(queryType);
  }

  // Boolean result
  if (queryType.resultType === "boolean") {
    return await handleBoolean(queryType);
  }

  throw new Error("Unsupported query type");
}

// deno-lint-ignore no-explicit-any
async function handleBindings(queryType: any): Promise<Response> {
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

  const result = {
    head: { vars },
    results: { bindings },
  };

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/sparql-results+json" },
  });
}

// deno-lint-ignore no-explicit-any
async function handleBoolean(queryType: any): Promise<Response> {
  const booleanResult = await queryType.execute();
  const result = {
    head: {},
    boolean: booleanResult,
  };
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/sparql-results+json" },
  });
}
