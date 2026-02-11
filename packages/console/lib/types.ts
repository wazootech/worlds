import type { WorldsOptions } from "@fartlabs/worlds";

/**
 * CreateToolsOptions are the options for creating tools.
 */
export interface CreateToolsOptions extends WorldsOptions {
  /**
   * write is a flag indicating whether the tools allow writing (INSERT, DELETE, etc.)
   */
  write?: boolean;

  /**
   * generateIri is a function that generates an IRI for new entities.
   */
  generateIri?: () => string;

  /**
   * sources are the sources for the tools.
   */
  sources?: SourceOptions[];
}

/**
 * SourceOptions are the options for a source.
 */
export interface SourceOptions {
  /**
   * worldId is the ID of the source world.
   */
  worldId: string;

  /**
   * default is a flag indicating whether the source is the default source.
   */
  default?: boolean;
}
