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
