import { DataFactory, Parser, Writer } from "n3";
import { executeSparql } from "#/rdf/sparql-engine.ts";
import type { FactTableUpsert } from "./schema.ts";
import type { WorldsStorage } from "#/storage.ts";
import { skolemizeQuad } from "#/rdf/patch/skolem.ts";

const { namedNode, literal, quad } = DataFactory;
const DEFAULT_GRAPH = "https://wazoo.dev/worlds/graphs/default";

/**
 * FactsRepository handles the persistence of RDF quads in-memory using an N3 Store.
 * Maintains an ID index for deletion support.
 */
export class FactsRepository {
  private readonly idIndex = new Map<string, string>();

  constructor(private readonly storage: WorldsStorage) {}

  private toQuad(fact: FactTableUpsert) {
    const object =
      fact.object.startsWith("http") || fact.object.startsWith("_:")
        ? namedNode(fact.object)
        : literal(fact.object);

    return quad(
      namedNode(fact.subject),
      namedNode(fact.predicate),
      object,
      namedNode(fact.graph ?? DEFAULT_GRAPH),
    );
  }

  private quadToId(quad: ReturnType<typeof this.toQuad>): string {
    return this.idIndex.get(quadToKey(quad)) ?? "";
  }

  upsert(fact: FactTableUpsert): Promise<void> {
    const q = this.toQuad(fact);
    const key = quadToKey(q);

    const existingId = this.idIndex.get(key);
    if (existingId) {
      this.idIndex.delete(key);
      const existingQuad = this.storage.store.getQuads(null, null, null, null)
        .find((existingQ) => quadToKey(existingQ) === key);
      if (existingQuad) {
        this.storage.store.removeQuad(existingQuad);
      }
    }

    this.storage.store.addQuad(q);
    this.idIndex.set(key, fact.id);
  }

  delete(id: string): Promise<void> {
    const keyToRemove = Array.from(this.idIndex.entries())
      .find(([, v]) => v === id)?.[0];

    if (!keyToRemove) return;

    this.idIndex.delete(keyToRemove);

    const quad = this.storage.store.getQuads(null, null, null, null)
      .find((q) => quadToKey(q) === keyToRemove);

    if (quad) {
      this.storage.store.removeQuad(quad);
    }
  }

  getAll(): Promise<FactTableUpsert[]> {
    const quads = this.storage.store.getQuads(null, null, null, null);
    return quads.map((q) => {
      const key = quadToKey(q);
      const id = this.idIndex.get(key) ?? crypto.randomUUID();
      return {
        id,
        subject: q.subject.value,
        predicate: q.predicate.value,
        object: q.object.value,
        graph: q.graph.value,
      };
    });
  }

  getByGraph(graph: string): Promise<FactTableUpsert[]> {
    const quads = this.storage.store.getQuads(
      null,
      null,
      null,
      namedNode(graph),
    );
    return quads.map((q) => {
      const key = quadToKey(q);
      const id = this.idIndex.get(key) ?? crypto.randomUUID();
      return {
        id,
        subject: q.subject.value,
        predicate: q.predicate.value,
        object: q.object.value,
        graph: q.graph.value,
      };
    });
  }

  async query(sparqlQuery: string): Promise<unknown> {
    return await executeSparql(this.storage.store, sparqlQuery);
  }

  async import(data: string | Uint8Array, contentType: string): Promise<void> {
    const parser = new Parser({ format: contentType });
    const parsedData = data instanceof Uint8Array
      ? new TextDecoder().decode(data)
      : data;

    const quads = parser.parse(parsedData);

    for (const q of quads) {
      const key = quadToKey(q);
      if (!this.idIndex.has(key)) {
        const id = await skolemizeQuad(q);
        this.idIndex.set(key, id);
      }
    }

    this.storage.store.addQuads(quads);
  }

  async export(
    contentType: string = "application/n-quads",
  ): Promise<ArrayBuffer> {
    const writer = new Writer({ format: contentType });
    const quads = this.storage.store.getQuads(null, null, null, null);
    writer.addQuads(quads);

    const nQuadsString = await new Promise<string>((resolve, reject) => {
      writer.end((error: Error | null, result: string | undefined) => {
        if (error) reject(error);
        else resolve(result as string);
      });
    });
    return new TextEncoder().encode(nQuadsString).buffer;
  }
}

function quadToKey(q: ReturnType<typeof quad>): string {
  return `${q.subject.value}|${q.predicate.value}|${q.object.value}|${q.graph.value}`;
}
