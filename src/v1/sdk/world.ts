import type { WorldUsageSummary } from "#/accounts/accounts-service.ts";
import type { WorldsOptions } from "./worlds.ts";
import { Worlds } from "./worlds.ts";

export type { WorldsOptions, WorldUsageSummary };

export { Worlds };

/**
 * World is a TypeScript SDK for a World in the Worlds API.
 */
export class World {
  private readonly worlds: Worlds;

  public constructor(
    public readonly options: WorldsOptions & { worldId: string },
  ) {
    this.worlds = new Worlds(options);
  }

  /**
   * get gets the world.
   */
  public get(encoding: string): Promise<string | null> {
    return this.worlds.getWorld(this.options.worldId, encoding);
  }

  /**
   * set sets the world.
   */
  public set(world: string, encoding: string): Promise<void> {
    return this.worlds.setWorld(this.options.worldId, world, encoding);
  }

  /**
   * addQuads adds quads to the world.
   */
  public addQuads(data: string, encoding: string): Promise<void> {
    return this.worlds.addQuads(this.options.worldId, data, encoding);
  }

  /**
   * remove removes the world.
   */
  public remove(): Promise<void> {
    return this.worlds.removeWorld(this.options.worldId);
  }

  /**
   * query executes a SPARQL query against the world.
   */
  // deno-lint-ignore no-explicit-any
  public query(query: string): Promise<any> {
    return this.worlds.queryWorld(this.options.worldId, query);
  }

  /**
   * update executes a SPARQL update against the world.
   */
  public update(update: string): Promise<void> {
    return this.worlds.updateWorld(this.options.worldId, update);
  }

  /**
   * getUsage retrieves the usage summary for the authenticated account.
   */
  public async getUsage(): Promise<WorldUsageSummary> {
    const response = await fetch(
      `${this.options.baseUrl}/worlds/${this.options.worldId}/usage`,
      {
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get usage: ${response.statusText}`);
    }

    return await response.json();
  }
}
