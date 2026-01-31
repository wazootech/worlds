import { z } from "zod";

/**
 * inviteTableSchema is the Zod schema for the invites database table.
 * This represents the raw database row structure.
 */
export const inviteTableSchema = z.object({
  code: z.string(),
  created_at: z.number(),
  redeemed_by: z.string().nullable(),
  redeemed_at: z.number().nullable(),
});

/**
 * InviteTable represents an invite record as stored in the database.
 */
export type InviteTable = z.infer<typeof inviteTableSchema>;

/**
 * inviteTableInsertSchema is the Zod schema for inserting a new invite.
 */
export const inviteTableInsertSchema = inviteTableSchema;

/**
 * InviteTableInsert represents the data needed to insert a new invite.
 */
export type InviteTableInsert = z.infer<typeof inviteTableInsertSchema>;

/**
 * inviteTableUpdateSchema is the Zod schema for updating an invite (marking as redeemed).
 */
export const inviteTableUpdateSchema = inviteTableSchema
  .pick({ redeemed_by: true, redeemed_at: true })
  .partial();

/**
 * InviteTableUpdate represents the data needed to update an invite.
 */
export type InviteTableUpdate = z.infer<typeof inviteTableUpdateSchema>;
