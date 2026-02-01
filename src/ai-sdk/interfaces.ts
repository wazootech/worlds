import type { WorldsSdkOptions } from "#/sdk/interfaces.ts";

/**
 * CreateToolsOptions is the options for the createTools function.
 */
export interface CreateToolsOptions extends WorldsSdkOptions {
  /**
   * primary is the primary source for the tools.
   */
  primary?: string;

  /**
   * sources is the list of sources visible to the tools.
   */
  sources: Source[];
}

/**
 * Source is the ID of a source.
 */
export interface Source {
  /**
   * id is the ID of the source.
   */
  id: string;

  /**
   * schema is true if the source contains schema information.
   */
  schema?: boolean;
}
