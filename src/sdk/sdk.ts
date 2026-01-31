import type { WorldsOptions } from "./interfaces.ts";
import { Invites } from "./invites/sdk.ts";
import { Tenants } from "./tenants/sdk.ts";
import { Worlds } from "./worlds/sdk.ts";

/**
 * WorldsSdk is the main entry point for the Worlds API SDK.
 */
export class WorldsSdk {
  public readonly worlds: Worlds;
  public readonly invites: Invites;
  public readonly tenants: Tenants;

  public constructor(options: WorldsOptions) {
    this.worlds = new Worlds(options);
    this.invites = new Invites(options);
    this.tenants = new Tenants(options);
  }
}
