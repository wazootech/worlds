import { z } from "zod";

/**
 * worldTableSchema is the Zod schema for the worlds database table.
 * This represents the raw database row structure including the blob.
 */
const worldTableShape = z.object({
  id: z.string(),
  organization_id: z.string().nullable(),
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
  id: string;
  organization_id: string | null;
  label: string;
  description: string | null;
  db_hostname: string | null;
  db_token: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/**
 * worldRowSchema is the Zod schema for a world record as returned by the SELECT queries.
 * This omits the potentially large blob field for performance.
 */
export const worldRowSchema: z.ZodType<WorldRow> = worldTableSchema;

/**
 * WorldRow represents a world record without the blob field.
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
    id: true,
    organization_id: true,
    created_at: true,
  })
  .partial();

/**
 * WorldTableUpdate represents the data needed to update a world.
 */
export type WorldTableUpdate = Partial<
  Omit<WorldTable, "id" | "organization_id" | "created_at">
>;
