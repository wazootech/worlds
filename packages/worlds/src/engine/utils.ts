import type { Store } from "n3";
import type { World } from "../schema.ts";
import type { WorldRow } from "../management/worlds.ts";
import { toWorldName } from "../sources/resolver.ts";
import type { WorldId } from "@wazoo/worlds-spec";

/**
 * SyncableStore combines an RDF store with a sync operation for indexing.
 */
export interface SyncableStore {
  store: Store;
  sync: () => Promise<void>;
}

/**
 * mapRowToWorld converts a database row to a World object.
 */
export function mapRowToWorld(row: WorldRow): World {
  return {
    name: toWorldName({
      namespace: row.namespace ?? undefined,
      id: row.id ?? undefined,
    }),
    id: row.id as WorldId, // Cast for branded id
    namespace: row.namespace ?? undefined,
    displayName: row.label ?? undefined,
    description: row.description ?? undefined,
    createTime: row.created_at,
    updateTime: row.updated_at,
    deleteTime: row.deleted_at ?? undefined,
  };
}

/**
 * mapRowsToWorlds converts an array of database rows to World objects.
 */
export function mapRowsToWorlds(rows: WorldRow[]): World[] {
  return rows.map(mapRowToWorld);
}
