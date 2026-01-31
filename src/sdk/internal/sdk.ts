import type { WorldsOptions } from "#/sdk/types.ts";
import { Worlds } from "#/sdk/worlds.ts";

import { Tenants } from "./tenants.ts";
import { Invites } from "./invites.ts";

/**
 * InternalWorldsSdk is a TypeScript SDK for internal-only operations
 * on the Worlds API.
 */
export class InternalWorldsSdk {
  public readonly tenants: Tenants;
  public readonly invites: Invites;
  public readonly worlds: Worlds;

  public constructor(options: WorldsOptions) {
    // Initialize internal SDK modules.
    this.tenants = new Tenants(options);
    this.invites = new Invites(options);

    // Initialize public SDK modules.
    this.worlds = new Worlds(options);
  }
}
