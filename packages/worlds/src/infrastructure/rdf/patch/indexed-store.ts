import type { Quad, Store } from "n3";
import type { Patch, PatchHandler } from "./types.ts";
import { skolemizeQuad } from "./skolem.ts";

/**
 * PatchQueue is a synchronous queue for capturing store changes during sync operations.
 */
export class PatchQueue {
  private patches: Patch[] = [];

  public push(patches: Patch[]): void {
    this.patches.push(...patches);
  }

  public flush(): Patch[] {
    const patches = this.patches;
    this.patches = [];
    return patches;
  }
}

/**
 * IndexedStore wraps an RDF/JS store and emits patches for external indexing.
 * It also maintains an in-memory mapping of stable Fact IDs.
 */
export class IndexedStore {
  private readonly idIndex = new Map<string, string>(); // TripleKey -> FactID
  private readonly reverseIndex = new Map<string, Quad>(); // FactID -> Quad

  constructor(
    public readonly target: Store,
    private readonly handlers: PatchHandler[],
  ) {}

  /**
   * sync flushes the patch queue and notifies all handlers.
   * This ensures indexing (search, etc) stays consistent with the store.
   */
  public async sync(queue: PatchQueue): Promise<void> {
    const patches = queue.flush();
    console.log(
      `[IndexedStore] Syncing ${patches.length} patches with ${this.handlers.length} handlers`,
    );
    if (patches.length === 0) return;

    for (const patch of patches) {
      const deletions = patch.deletions || [];
      const insertions = patch.insertions || [];

      // Handle deletions (O(1) lookup via quadToKey)
      for (const q of deletions) {
        const key = quadToKey(q);
        const id = this.idIndex.get(key);
        if (id) {
          this.idIndex.delete(key);
          this.reverseIndex.delete(id);
        }
      }

      // Handle insertions (Parallel skolemization)
      const newQuads = insertions.filter((q) =>
        !this.idIndex.has(quadToKey(q))
      );
      const ids = await Promise.all(newQuads.map((q) => skolemizeQuad(q)));

      for (let i = 0; i < newQuads.length; i++) {
        const q = newQuads[i];
        const id = ids[i];
        const key = quadToKey(q);
        this.idIndex.set(key, id);
        this.reverseIndex.set(id, q);
      }
    }

    // Notify external handlers (e.g., Search Index)
    await Promise.all(this.handlers.map((h) => h.patch(patches)));
  }

  /**
   * getQuadById retrieves a quad using its stable Fact ID.
   */
  public getQuadById(id: string): Quad | undefined {
    return this.reverseIndex.get(id);
  }

  /**
   * getFactId retrieves the stable ID for a given quad.
   */
  public getFactId(q: Quad): string | undefined {
    return this.idIndex.get(quadToKey(q));
  }
}

/**
 * createIndexedStore proxies a Store to capture write events.
 */
export function createIndexedStore(
  target: Store,
  handlers: PatchHandler[],
): { store: Store; index: IndexedStore; sync: () => Promise<void> } {
  const queue = new PatchQueue();
  const index = new IndexedStore(target, handlers);

  const proxiedStore = new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        if (prop === "addQuad" || prop === "add") {
          return (quad: Quad) => {
            const result = (target[prop] as unknown as (q: Quad) => Store)(
              quad,
            );
            queue.push([{ insertions: [quad], deletions: [] }]);
            return result;
          };
        }
        if (prop === "addQuads") {
          return (quads: Quad[]) => {
            const result = target.addQuads(quads);
            queue.push([{ insertions: quads, deletions: [] }]);
            return result;
          };
        }
        if (prop === "removeQuad" || prop === "remove") {
          return (quad: Quad) => {
            const result = (target[prop] as unknown as (q: Quad) => Store)(
              quad,
            );
            queue.push([{ insertions: [], deletions: [quad] }]);
            return result;
          };
        }
        if (prop === "removeQuads") {
          return (quads: Quad[]) => {
            const result = (target[prop] as unknown as (q: Quad[]) => Store)(
              quads,
            );
            queue.push([{ insertions: [], deletions: quads }]);
            return result;
          };
        }

        // Proxy the RDF/JS import method (often used by Comunica)
        if (prop === "import") {
          return (
            stream: {
              on: (event: string, handler: (quad: Quad) => void) => void;
            },
          ) => {
            stream.on("data", (quad: Quad) => {
              queue.push([{ insertions: [quad], deletions: [] }]);
            });
            // @ts-ignore: n3 store types are incomplete for proxies
            return target.import(stream as unknown as Record<string, unknown>);
          };
        }

        return value.bind(target);
      }
      return value;
    },
  }) as Store;

  return {
    store: proxiedStore,
    index,
    sync: () => index.sync(queue),
  };
}

function quadToKey(q: Quad): string {
  return `${q.subject.value}|${q.predicate.value}|${q.object.value}|${q.graph.value}`;
}
