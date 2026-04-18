import { decodeCursor, encodeCursor } from "#/utils.ts";

/**
 * NamespaceRow represents a namespace record from the database.
 */
export interface NamespaceRow {
  id: string;
  label: string;
  created_at: number;
  updated_at: number;
}

/**
 * NamespaceInsert represents data needed to insert a new namespace.
 */
export interface NamespaceInsert {
  id: string;
  label: string;
  created_at: number;
  updated_at: number;
}

/**
 * NamespacesListParams represents the parameters for listing namespaces.
 */
export interface NamespacesListParams {
  pageSize?: number;
  pageToken?: string;
}

/**
 * NamespacesListResult represents the result of listing namespaces.
 */
export interface NamespacesListResult {
  namespaces: NamespaceRow[];
  nextPageToken?: string;
}

/**
 * NamespaceRepository handles the persistence of namespaces using an in-memory Map.
 */
export class NamespaceRepository {
  private readonly namespaces = new Map<string, NamespaceRow>();

  constructor() {}

  async get(id: string): Promise<NamespaceRow | null> {
    return this.namespaces.get(id) ?? null;
  }

  async list(params: NamespacesListParams): Promise<NamespacesListResult> {
    const { pageSize = 50, pageToken } = params;

    const all = Array.from(this.namespaces.values());
    all.sort((a, b) => b.created_at - a.created_at || b.id.localeCompare(a.id));

    let startIndex = 0;
    if (pageToken) {
      const cursor = decodeCursor(pageToken);
      if (cursor) {
        startIndex = all.findIndex((n) =>
          n.created_at === cursor.created_at && n.id === cursor.id
        ) + 1;
      }
    }

    const namespaces = all.slice(startIndex, startIndex + pageSize);
    let nextPageToken: string | undefined;
    if (startIndex + pageSize < all.length) {
      const last = namespaces[namespaces.length - 1];
      nextPageToken = encodeCursor({
        created_at: last.created_at,
        id: last.id,
      });
    }

    return { namespaces, nextPageToken };
  }

  async insert(namespace: NamespaceInsert): Promise<void> {
    if (this.namespaces.has(namespace.id)) return;
    this.namespaces.set(namespace.id, { ...namespace });
  }

  async update(
    id: string,
    updates: { label?: string; updated_at?: number },
  ): Promise<void> {
    const existing = this.namespaces.get(id);
    if (!existing) return;
    this.namespaces.set(id, {
      ...existing,
      ...updates,
      updated_at: updates.updated_at ?? Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    this.namespaces.delete(id);
  }
}
