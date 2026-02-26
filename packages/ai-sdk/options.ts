import type { Source, WorldsSdk } from "@wazoo/worlds-sdk";
import type {
  DisambiguateEntitiesInput,
  DisambiguateEntitiesOutput,
} from "#/tools/disambiguate-entities.ts";

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

  /**
   * disambiguate is a function that disambiguates entities.
   */
  disambiguate?: (
    input: DisambiguateEntitiesInput,
  ) => DisambiguateEntitiesOutput | Promise<DisambiguateEntitiesOutput>;

  /**
   * shacl is the SHACL shapes (Turtle) to use for validation.
   */
  shacl?: string;
}
