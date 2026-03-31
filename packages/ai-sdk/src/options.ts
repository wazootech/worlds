import type { Source, Worlds } from "@wazoo/worlds-sdk";
import type {
  DisambiguateEntitiesInput,
  DisambiguateEntitiesOutput,
} from "#/tools/disambiguate-entities.ts";

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
   * worlds is the Worlds instance to use for the tools.
   */
  worlds: Worlds;

  /**
   * sources is the list of sources visible to the tools.
   */
  sources: SourceInput[];

  /**
   * generateIri generates an IRI for new entities.
   */
  generateIri?: () => string | Promise<string>;

  /**
   * disambiguate maps natural language entities to existing IRIs.
   */
  disambiguate?: (
    input: DisambiguateEntitiesInput,
  ) => DisambiguateEntitiesOutput | Promise<DisambiguateEntitiesOutput>;

  /**
   * shacl is the SHACL shapes (Turtle) to use for validation.
   */
  shacl?: string;
}
