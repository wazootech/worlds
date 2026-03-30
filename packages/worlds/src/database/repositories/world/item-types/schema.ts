import { z } from "zod";

/**
 * ItemTypeRow represents an item type record in the database.
 */
export interface ItemTypeRow {
  /**
   * subject is the URI of the item.
   */
  subject: string;

  /**
   * type is the URI of the RDF type.
   */
  type: string;
}

/**
 * itemTypeRowSchema is the Zod schema for ItemTypeRow.
 */
export const itemTypeRowSchema: z.ZodType<ItemTypeRow> = z.object({
  subject: z.string(),
  type: z.string(),
});
