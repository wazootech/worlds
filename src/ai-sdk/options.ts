import type { Source, WorldsSdkOptions } from "#/sdk/interfaces.ts";

/**
 * CreateToolsOptions is the options for the createTools function.
 */
export interface CreateToolsOptions extends WorldsSdkOptions {
  /**
   * sources is the list of sources visible to the tools.
   */
  sources: Source[];

  /**
   * generateIri is a function that generates an IRI for new entities.
   */
  generateIri?: () => string | Promise<string>;
}
