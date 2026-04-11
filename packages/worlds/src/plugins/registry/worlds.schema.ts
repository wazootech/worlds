import { z } from "zod";

/**
 * worldTableSchema is the Zod schema for the worlds database table.
 */
const worldTableShape = z.object({
  namespace_id: z.string(),
  slug: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  db_hostname: z.string().nullable(),
  db_token: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

export const worldTableSchema: z.ZodType<WorldTable> = worldTableShape;

/**
 * WorldTable represents a full world record as stored in the database.
 */
export interface WorldTable {
  /**
   * namespace_id is the identifier of the namespace that owns the world.
   */
  namespace_id: string;

  /**
   * slug is the unique identifier (within a namespace) for the world.
   */
  slug: string;

  /**
   * label is the human-readable title of the world.
   */
  label: string;

  /**
   * description is an optional summary of the world.
   */
  description: string | null;

  /**
   * db_hostname is the hostname of the remote database, if any.
   */
  db_hostname: string | null;

  /**
   * db_token is the authentication token for the remote database.
   */
  db_token: string | null;

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
 * worldRowSchema is the Zod schema for a world record as returned by the SELECT queries.
 */
export const worldRowSchema: z.ZodType<WorldRow> = worldTableSchema;

/**
 * WorldRow represents a world record.
 */
export type WorldRow = WorldTable;

/**
 * worldTableInsertSchema is the Zod schema for inserting a new world.
 */
export const worldTableInsertSchema: z.ZodType<WorldTableInsert> =
  worldTableSchema;

/**
 * WorldTableInsert represents the data needed to insert a new world.
 */
export type WorldTableInsert = WorldTable;

/**
 * worldTableUpdateSchema is the Zod schema for updating a world.
 */
export const worldTableUpdateSchema: z.ZodType<
  WorldTableUpdate
> = worldTableShape
  .omit({
    namespace_id: true,
    slug: true,
    created_at: true,
  })
  .partial();

/**
 * WorldTableUpdate represents the data needed to update a world.
 */
export type WorldTableUpdate = Partial<
  Omit<WorldTable, "namespace_id" | "slug" | "created_at">
>;

