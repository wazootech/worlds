import { z } from "zod";
import type { ApiKeyRepository } from "./keys.ts";
import type { NamespaceRepository } from "./namespaces.ts";
import type { WorldRepository } from "./worlds.ts";

/**
 * ManagementLayer defines the interface for world and namespace metadata.
 */
export interface ManagementLayer {
  keys: ApiKeyRepository;
  namespaces: NamespaceRepository;
  worlds: WorldRepository;
}

/**
 * worldRowSchema is the Zod schema for the worlds database table.
 */
const worldRowShape = z.object({
  namespace: z.string().optional(),
  id: z.string().optional(),
  label: z.string(),
  description: z.string().optional(),
  connection_uri: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

export const worldRowSchema: z.ZodType<WorldRow> = worldRowShape;

/**
 * WorldRow represents a full world record as stored in the database.
 */
export type WorldRow = {
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
   * Uses URL search params for extensibility.
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
};

/**
 * worldRowInsertSchema is the Zod schema for inserting a new world.
 */
export const worldRowInsertSchema: z.ZodType<WorldRowInsert> = worldRowShape;

/**
 * WorldRowInsert represents the data needed to insert a new world.
 */
export type WorldRowInsert = WorldRow;

/**
 * worldRowUpdateSchema is the Zod schema for updating a world.
 */
export const worldRowUpdateSchema: z.ZodType<
  WorldRowUpdate
> = worldRowShape
  .omit({
    namespace: true,
    id: true,
    created_at: true,
  })
  .partial();

/**
 * WorldRowUpdate represents the data needed to update a world.
 */
export type WorldRowUpdate = Partial<
  Omit<WorldRow, "namespace" | "id" | "created_at">
>;
