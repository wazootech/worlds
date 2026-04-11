import type { Quad, Store } from "n3";
import type { Patch, PatchHandler, PatchHandlerSync } from "./types.ts";

/**
 * PatchQueue is a queue of patches.
 */
export class PatchQueue implements PatchHandlerSync {
  private patches: Patch[] = [];

  public patch(patches: Patch[]): void {
    this.patches.push(...patches);
  }

  public flush(): Patch[] {
    const patches = this.patches;
    this.patches = [];
    return patches;
  }
}

/**
 * proxyN3Store proxies an N3 Store with a patch handler.
 *
 * This is PERMISSIVE and does not filter quads.
 */
export function proxyN3Store(target: Store, handler: PatchHandlerSync): Store {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        if (prop === "addQuad" || prop === "add") {
          return (quad: Quad) => {
            const result = (target[prop] as unknown as (q: Quad) => Store)(
              quad,
            );
            handler.patch([{ insertions: [quad], deletions: [] }]);
            return result;
          };
        }
        if (prop === "addQuads") {
          return (quads: Quad[]) => {
            const result = target.addQuads(quads);
            handler.patch([{ insertions: quads, deletions: [] }]);
            return result;
          };
        }
        if (prop === "removeQuad" || prop === "remove") {
          return (quad: Quad) => {
            const result = (target[prop] as unknown as (q: Quad) => Store)(
              quad,
            );
            handler.patch([{ insertions: [], deletions: [quad] }]);
            return result;
          };
        }
        if (prop === "removeQuads") {
          return (quads: Quad[]) => {
            const result = (target[prop] as unknown as (q: Quad[]) => Store)(
              quads,
            );
            handler.patch([{ insertions: [], deletions: quads }]);
            return result;
          };
        }
        if (prop === "import") {
          return (
            stream: {
              on(event: string, listener: (data: unknown) => void): void;
            },
          ) => {
            // RDF/JS streams are EventEmitters
            if (stream && typeof stream.on === "function") {
              stream.on("data", (quad: unknown) => {
                handler.patch([{ insertions: [quad as Quad], deletions: [] }]);
              });
            }
            return (target as unknown as Record<
              string,
              (s: unknown) => unknown
            >)[prop](stream);
          };
        }
        return value.bind(target);
      }
      return value;
    },
  }) as Store;
}

/**
 * connectSearchStoreToN3Store connects a search store to an N3 store.
 */
export function connectSearchStoreToN3Store(
  searchStore: PatchHandler,
  n3Store: Store,
): { store: Store; sync: () => Promise<void> } {
  const patchQueue = new PatchQueue();
  const proxiedStore = proxyN3Store(n3Store, patchQueue);

  return {
    store: proxiedStore,
    sync: async () => {
      const patches = patchQueue.flush();
      if (patches.length > 0) {
        await searchStore.patch(patches);
      }
    },
  };
}
