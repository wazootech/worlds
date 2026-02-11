import { z } from "zod";

/**
 * InviteTable represents an invite record as stored in the database.
 */
export interface InviteTable {
  code: string;
  created_at: number;
  redeemed_by: string | null;
  redeemed_at: number | null;
}

/**
 * inviteTableSchema is the Zod schema for the invites database table.
 * This represents the raw database row structure.
 */
const inviteTableShape = z.object({
  code: z.string(),
  created_at: z.number(),
  redeemed_by: z.string().nullable(),
  redeemed_at: z.number().nullable(),
});

export const inviteTableSchema: z.ZodType<InviteTable> = inviteTableShape;

/**
 * InviteTableInsert represents the data needed to insert a new invite.
 */
export type InviteTableInsert = InviteTable;

/**
 * inviteTableInsertSchema is the Zod schema for inserting a new invite.
 */
export const inviteTableInsertSchema: z.ZodType<
  InviteTableInsert
> = inviteTableSchema;

/**
 * InviteTableUpdate represents the data needed to update an invite.
 */
export type InviteTableUpdate = Partial<
  Pick<InviteTable, "redeemed_by" | "redeemed_at">
>;

/**
 * inviteTableUpdateSchema is the Zod schema for updating an invite (marking as redeemed).
 */
export const inviteTableUpdateSchema: z.ZodType<
  InviteTableUpdate
> = inviteTableShape
  .pick({ redeemed_by: true, redeemed_at: true })
  .partial();
