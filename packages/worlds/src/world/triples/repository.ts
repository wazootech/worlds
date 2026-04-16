import type { Client } from "@libsql/client";
import { Parser, Store, Writer } from "n3";
import { executeSparql } from "#/rdf/sparql-engine.ts";
import {
  deleteTriples,
  selectAllTriples,
  selectTriplesByGraph,
  upsertTriples,
} from "./queries.sql.ts";
import type { TripleTableUpsert } from "./schema.ts";

const DEFAULT_GRAPH = "<default>";

export class TriplesRepository {
  constructor(private readonly db: Client) {}

  async upsert(triple: TripleTableUpsert): Promise<void> {
    await this.db.execute({
      sql: upsertTriples,
      args: [
        triple.id,
        triple.subject,
        triple.predicate,
        triple.object,
        triple.graph ?? DEFAULT_GRAPH,
      ],
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.execute({ sql: deleteTriples, args: [id] });
  }

  async getAll(): Promise<TripleTableUpsert[]> {
    const result = await this.db.execute({ sql: selectAllTriples, args: [] });
    return result.rows as unknown as TripleTableUpsert[];
  }

  async getByGraph(graph: string): Promise<TripleTableUpsert[]> {
    const result = await this.db.execute({
      sql: selectTriplesByGraph,
      args: [graph],
    });
    return result.rows as unknown as TripleTableUpsert[];
  }

  async query(sparqlQuery: string): Promise<unknown> {
    const triples = await this.getAll();
    const store = new Store();

    const quads = triples.map((t) => ({
      subject: t.subject,
      predicate: t.predicate,
      object: t.object,
      graph: t.graph ?? DEFAULT_GRAPH,
    }));
    // @ts-ignore - n3 accepts any quad format
    store.addQuads(quads);

    return await executeSparql(store, sparqlQuery);
  }

  async import(data: string | Uint8Array, contentType: string): Promise<void> {
    const parser = new Parser({ format: contentType });
    const parsedData = data instanceof Uint8Array
      ? new TextDecoder().decode(data)
      : data;
    const quads = parser.parse(parsedData);

    for (const quad of quads) {
      const id = crypto.randomUUID();
      await this.upsert({
        id,
        subject: quad.subject.value,
        predicate: quad.predicate.value,
        object: quad.object.value,
        graph: quad.graph?.value ?? DEFAULT_GRAPH,
      });
    }
  }

  async export(
    contentType: string = "application/n-quads",
  ): Promise<ArrayBuffer> {
    const triples = await this.getAll();
    const store = new Store();

    const quads = triples.map((t) => ({
      subject: t.subject,
      predicate: t.predicate,
      object: t.object,
      graph: t.graph ?? DEFAULT_GRAPH,
    }));
    // @ts-ignore - n3 accepts any quad format
    store.addQuads(quads);

    const writer = new Writer({ format: contentType });
    const nQuadsString = await new Promise<string>((resolve, reject) => {
      writer.end((error: Error | null, result: string | undefined) => {
        if (error) reject(error);
        else resolve(result as string);
      });
    });
    return new TextEncoder().encode(nQuadsString).buffer;
  }
}
