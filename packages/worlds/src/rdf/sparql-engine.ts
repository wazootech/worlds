import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import type { Store } from "n3";
import type {
  SparqlBinding,
  SparqlQuad,
  SparqlValue,
  WorldsSparqlOutput,
} from "#/schemas/mod.ts";

export const queryEngine = new QueryEngine();

export async function executeSparql(
  store: Store,
  query: string,
  baseIRI?: string,
): Promise<WorldsSparqlOutput> {
  const queryType = await queryEngine.query(query, {
    sources: [store],
    baseIRI,
  });

  if (queryType.resultType === "void") {
    await queryType.execute();
    return null as unknown as WorldsSparqlOutput;
  }

  if (queryType.resultType === "bindings") {
    return await handleBindings(queryType);
  }

  if (queryType.resultType === "boolean") {
    return await handleBoolean(queryType);
  }

  if (queryType.resultType === "quads") {
    return await handleQuads(queryType);
  }

  throw new Error("Unsupported query type");
}

async function handleBindings(queryType: {
  execute(): Promise<unknown>;
  metadata(): Promise<{ variables: { value: string }[] }>;
}): Promise<WorldsSparqlOutput> {
  const bindingsStream = await queryType.execute();
  // @ts-ignore - Comunica types are complex
  const vars = (await queryType.metadata()).variables.map((
    v: { value: string },
  ) => v.value);

  const bindings = await new Promise<SparqlBinding[]>((resolve, reject) => {
    const b: SparqlBinding[] = [];
    let finished = false;

    const onData = (binding: unknown) => {
      if (finished) return;
      // @ts-ignore - Comunica bindings are iterables
      const bindingMap = binding as Iterable<[unknown, unknown]>;
      const bindingObj: SparqlBinding = {};
      for (const v of vars) {
        // @ts-ignore - term iteration
        const term = bindingMap.get(v);
        if (term) {
          bindingObj[v] = toSparqlValue(term);
        }
      }
      b.push(bindingObj);
    };

    const onEnd = () => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(b);
    };

    const onError = (err: unknown) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      // @ts-ignore - event emitter
      bindingsStream.off("data", onData);
      // @ts-ignore - event emitter
      bindingsStream.off("end", onEnd);
      // @ts-ignore - event emitter
      bindingsStream.off("error", onError);
    };

    // @ts-ignore - event emitter
    bindingsStream.on("data", onData);
    // @ts-ignore - event emitter
    bindingsStream.on("end", onEnd);
    // @ts-ignore - event emitter
    bindingsStream.on("error", onError);
  });

  return {
    head: { vars, link: null },
    results: { bindings },
  };
}

async function handleBoolean(queryType: {
  execute(): Promise<boolean>;
}): Promise<WorldsSparqlOutput> {
  const booleanResult = await queryType.execute();
  return {
    head: { link: null },
    boolean: booleanResult,
  };
}

async function handleQuads(queryType: {
  execute(): Promise<unknown>;
}): Promise<WorldsSparqlOutput> {
  const quadsStream = await queryType.execute();
  const quads = await new Promise<SparqlQuad[]>((resolve, reject) => {
    const q: SparqlQuad[] = [];
    let finished = false;

    const onData = (quad: unknown) => {
      if (finished) return;
      // @ts-ignore - Comunica quad structure
      const subject = quad.subject;
      // @ts-ignore
      const predicate = quad.predicate;
      // @ts-ignore
      const object = quad.object;
      // @ts-ignore
      const graph = quad.graph;

      q.push({
        subject: {
          type: subject.termType === "NamedNode" ? "uri" : "bnode",
          value: subject.value,
        },
        predicate: {
          type: "uri",
          value: predicate.value,
        },
        object: toSparqlValue(object),
        graph: {
          type: graph.termType === "DefaultGraph" ? "default" : "uri",
          value: graph.value,
        },
      });
    };

    const onEnd = () => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(q);
    };

    const onError = (err: unknown) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      // @ts-ignore - event emitter
      quadsStream.off("data", onData);
      // @ts-ignore - event emitter
      quadsStream.off("end", onEnd);
      // @ts-ignore - event emitter
      quadsStream.off("error", onError);
    };

    // @ts-ignore - event emitter
    quadsStream.on("data", onData);
    // @ts-ignore - event emitter
    quadsStream.on("end", onEnd);
    // @ts-ignore - event emitter
    quadsStream.on("error", onError);
  });

  return {
    head: { link: null },
    results: { quads },
  };
}

function toSparqlValue(term: {
  termType: string;
  value: string;
  language?: string;
  datatype?: { value: string };
}): SparqlValue {
  if (term.termType === "NamedNode") {
    return { type: "uri", value: term.value };
  } else if (term.termType === "BlankNode") {
    return { type: "bnode", value: term.value };
  } else {
    const val: SparqlValue = {
      type: "literal",
      value: term.value,
    };
    if (term.language) {
      val["xml:lang"] = term.language;
    }
    if (
      term.datatype &&
      term.datatype.value !== "http://www.w3.org/2001/XMLSchema#string"
    ) {
      val.datatype = term.datatype.value;
    }
    return val;
  }
}
