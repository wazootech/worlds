import { createParser } from "deno_tree_sitter";
import { default as sparqlPlugin } from "common_tree_sitter_languages/sparql.js";

const sparqlParser = await createParser(sparqlPlugin);

/**
 * Helper function to check if query is an update
 * Needed to enforce POST-only for updates and return 204 status
 */
export function isUpdateQuery(query: string): boolean {
  const tree = sparqlParser.parse(query);
  if (!tree) {
    return false;
  }

  // Check children of the root node for update commands.
  for (const child of tree.rootNode.children) {
    if (
      [
        "insert_data",
        "delete_data",
        "delete_where",
        "modify",
        "load",
        "clear",
        "drop",
        "create",
        "add",
        "move",
        "copy",
      ].includes(child.type)
    ) {
      return true;
    }
  }

  return false;
}
