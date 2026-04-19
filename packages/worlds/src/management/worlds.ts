import { decodeCursor, encodeCursor } from "#/utils.ts";
import type { WorldRow, WorldRowInsert, WorldRowUpdate } from "./schema.ts";

/**
 * WorldsListParams represents the parameters for listing worlds.
 */
export interface WorldsListParams {
  namespace?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * WorldsListResult represents the result of listing worlds.
 */
export interface WorldsListResult {
  worlds: WorldRow[];
  nextPageToken?: string;
}

/**
 * WorldRepository manages world metadata using KV pattern.
 *
 * Multitenancy: Each namespace+world combination is a separate entry.
 * Key format: "${namespace}/${worldId}" (namespace defaults to "_" for root)
 *
 * This is the "worlds table" - swap Map for SQLite to persist.
 */
export class WorldRepository {
  private readonly worlds = new Map<string, WorldRow>();

  constructor() {}

  private getRef(id?: string, namespace?: string): string {
    return `${namespace ?? "_"}/${id ?? "_"}`;
  }

  public get(id?: string, namespace?: string): WorldRow | null {
    const key = this.getRef(id, namespace);
    return this.worlds.get(key) ?? null;
  }

  /**
   * getInternal retrieves a world by its identifier without namespace scoping.
   */
  public getInternal(id?: string): WorldRow | null {
    const found = Array.from(this.worlds.values()).find((w) => w.id === id);
    return found ?? null;
  }

  public list(params: WorldsListParams): WorldsListResult {
    const { namespace, pageSize = 50, pageToken } = params;

    const all = Array.from(this.worlds.values())
      .filter((w) => !namespace || w.namespace === namespace)
      .filter((w) => w.deleted_at === null);

    all.sort((a, b) =>
      b.created_at - a.created_at || (b.id ?? "").localeCompare(a.id ?? "")
    );

    let startIndex = 0;
    if (pageToken) {
      const cursor = decodeCursor(pageToken);
      if (cursor) {
        startIndex = all.findIndex((n) =>
          n.created_at === cursor.created_at && n.id === cursor.id
        ) + 1;
      }
    }

    const worlds = all.slice(startIndex, startIndex + pageSize);
    let nextPageToken: string | undefined;
    if (startIndex + pageSize < all.length) {
      const last = worlds[worlds.length - 1];
      nextPageToken = encodeCursor({
        created_at: last.created_at,
        id: last.id ?? "",
      });
    }

    return { worlds, nextPageToken };
  }

  public insert(world: WorldRowInsert): void {
    const key = this.getRef(world.id, world.namespace);
    if (this.worlds.has(key)) return;
    this.worlds.set(key, { ...world });
  }

  public update(
    id: string | undefined,
    namespace: string | undefined,
    updates: WorldRowUpdate,
  ): void {
    const key = this.getRef(id, namespace);
    const existing = this.worlds.get(key);
    if (!existing) return;
    this.worlds.set(key, {
      ...existing,
      ...updates,
      updated_at: updates.updated_at ?? Date.now(),
    });
  }

  public delete(id?: string, namespace?: string): void {
    const key = this.getRef(id, namespace);
    this.worlds.delete(key);
  }
}
