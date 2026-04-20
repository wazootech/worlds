import { decodeCursor, encodeCursor } from "#/utils.ts";
import type { ApiKeyRepository } from "./keys.ts";
import type { NamespaceRepository } from "./namespaces.ts";

/**
 * WorldRow represents a full world record as stored.
 * Key format: "${namespace}/${worldId}"
 */
export interface WorldRow {
  /**
   * namespace is the identifier of the namespace that owns the world.
   * Undefined indicates the default namespace.
   */
  namespace?: string;

  /**
   * id is the unique identifier (within a namespace) for the world.
   * Undefined indicates the default world.
   */
  id?: string;

  /**
   * label is the human-readable title of the world.
   */
  label: string;

  /**
   * description is an optional summary of the world.
   */
  description?: string;

  /**
   * connection_uri is the connection string for the world database.
   * Format: protocol://host?param1=value1&param2=value2
   */
  connection_uri: string | null;

  /**
   * created_at is the unix timestamp of creation.
   */
  created_at: number;

  /**
   * updated_at is the unix timestamp of the last update.
   */
  updated_at: number;

  /**
   * deleted_at is the unix timestamp of deletion, if any.
   */
  deleted_at: number | null;
}

/**
 * WorldRowInsert represents the data needed to insert a new world.
 */
export type WorldRowInsert = WorldRow;

/**
 * WorldRowUpdate represents the data needed to update a world.
 */
export type WorldRowUpdate = Partial<
  Omit<WorldRow, "namespace" | "id" | "created_at">
>;

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
 * ManagementLayer defines the interface for world and namespace metadata.
 */
export interface ManagementLayer {
  keys: ApiKeyRepository;
  namespaces: NamespaceRepository;
  worlds: WorldRepository;
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
