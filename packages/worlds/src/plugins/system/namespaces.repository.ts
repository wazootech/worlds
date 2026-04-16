import type { Client } from "@libsql/client";
import { decodeCursor, encodeCursor } from "#/core/utils.ts";
import {
  deleteNamespace,
  insertNamespace,
  selectAllNamespaces,
  selectNamespaceById,
  updateNamespace,
} from "./registry.sql.ts";

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
 * NamespaceUpdate represents data needed to update a namespace.
 */
export interface NamespaceUpdate {
  label?: string;
  updated_at?: number;
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
 * NamespacesRepository handles the persistence of namespaces in the registry database.
 */
export class NamespacesRepository {
  /**
   * constructor initializes the NamespacesRepository with a database client.
   * @param db The database client.
   */
  constructor(private readonly db: Client) {}

  /**
   * get retrieves a namespace by its ID.
   * @param id The namespace ID.
   * @returns The namespace row or null if not found.
   */
  async get(id: string): Promise<NamespaceRow | null> {
    const result = await this.db.execute({
      sql: selectNamespaceById,
      args: [id],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * list retrieves a paginated list of namespaces.
   * @param params The list parameters including pageSize and pageToken.
   * @returns An array of namespace rows and an optional next page token.
   */
  async list(params: NamespacesListParams): Promise<NamespacesListResult> {
    const { pageSize = 50, pageToken } = params;

    let cursorCreatedAt: number | null = null;
    let cursorId: string | null = null;

    if (pageToken) {
      const decoded = decodeCursor(pageToken);
      if (decoded) {
        cursorCreatedAt = decoded.created_at;
        cursorId = decoded.id;
      }
    }

    const result = await this.db.execute({
      sql: selectAllNamespaces,
      args: [
        cursorCreatedAt,
        cursorCreatedAt,
        cursorCreatedAt,
        cursorId,
        pageSize + 1,
      ],
    });

    const rows = (result.rows as Record<string, unknown>[]).map((row) =>
      this.mapRow(row)
    );

    let nextPageToken: string | undefined;
    if (rows.length > pageSize) {
      const lastRow = rows[pageSize - 1];
      nextPageToken = encodeCursor({
        created_at: lastRow.created_at,
        id: lastRow.id,
      });
      rows.length = pageSize;
    }

    return { namespaces: rows, nextPageToken };
  }

  /**
   * mapRow maps a database row to a NamespaceRow.
   */
  private mapRow(row: Record<string, unknown>): NamespaceRow {
    return {
      id: row.id as string,
      label: row.label as string,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    };
  }

  /**
   * insert creates a new namespace.
   * @param namespace The namespace data to insert.
   */
  async insert(namespace: NamespaceInsert): Promise<void> {
    await this.db.execute({
      sql: insertNamespace,
      args: [
        namespace.id,
        namespace.label,
        namespace.created_at,
        namespace.updated_at,
      ],
    });
  }

  /**
   * update modifies an existing namespace.
   * @param id The namespace ID.
   * @param updates The fields to update.
   */
  async update(id: string, updates: NamespaceUpdate): Promise<void> {
    const row = await this.get(id);
    if (!row) return;
    await this.db.execute({
      sql: updateNamespace,
      args: [
        updates.label ?? row.label,
        updates.updated_at ?? Date.now(),
        id,
      ],
    });
  }

  /**
   * delete removes a namespace by its ID.
   * @param id The namespace ID.
   */
  async delete(id: string): Promise<void> {
    await this.db.execute({ sql: deleteNamespace, args: [id] });
  }
}
