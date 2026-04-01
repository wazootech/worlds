import type { Source, WorldsInterface } from "@wazoo/worlds-sdk";

export type { WorldsInterface };

/**
 * SourceInput is a flexible way to specify a data source.
 * It can be a string (ID or slug) for read-only access, or a Source object for granular control.
 */
export type SourceInput = string | Source;

/**
 * CreateToolsOptions are the configuration options for tool creation.
 */
export interface CreateToolsOptions {
  /**
   * worlds is the Worlds interface to use for the tools.
   */
  worlds: WorldsInterface;

  /**
   * sources is the list of sources visible to the tools.
   */
  sources: SourceInput[];
}
