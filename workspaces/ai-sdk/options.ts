import type { Source, WorldsSdk } from "@wazoo/sdk";

/**
 * CreateToolsOptions is the options for the createTools function.
 */
export interface CreateToolsOptions {
  /**
   * sdk is the WorldsSdk instance to use for the tools.
   */
  sdk: WorldsSdk;

  /**
   * sources is the list of sources visible to the tools.
   */
  sources: Source[];

  /**
   * generateIri is a function that generates an IRI for new entities.
   */
  generateIri?: () => string | Promise<string>;
}
