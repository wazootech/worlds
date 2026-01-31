import { z } from "zod";

/**
 * worldTableSchema is the Zod schema for the worlds database table.
 * This represents the raw database row structure including the blob.
 */
export const worldTableSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  blob: z.union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
    .nullable(),
  created_at: z.number(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

/**
 * WorldTable represents a full world record as stored in the database.
 */
export type WorldTable = z.infer<typeof worldTableSchema>;

/**
 * worldRowSchema is the Zod schema for a world record as returned by the SELECT queries.
 * This omits the potentially large blob field for performance.
 */
export const worldRowSchema = worldTableSchema.omit({ blob: true });

/**
 * WorldRow represents a world record without the blob field.
 */
export type WorldRow = z.infer<typeof worldRowSchema>;

/**
 * worldTableInsertSchema is the Zod schema for inserting a new world.
 */
export const worldTableInsertSchema = worldTableSchema;

/**
 * WorldTableInsert represents the data needed to insert a new world.
 */
export type WorldTableInsert = z.infer<typeof worldTableInsertSchema>;

/**
 * worldTableUpdateSchema is the Zod schema for updating a world.
 */
export const worldTableUpdateSchema = worldTableSchema
  .omit({ id: true, tenant_id: true, created_at: true, deleted_at: true })
  .partial();

/**
 * WorldTableUpdate represents the data needed to update a world.
 */
export type WorldTableUpdate = z.infer<typeof worldTableUpdateSchema>;
