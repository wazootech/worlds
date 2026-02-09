import type { WorldsSdkOptions } from "./options.ts";
import { Invites } from "./clients/invites/sdk.ts";
import { Organizations } from "./clients/organizations/sdk.ts";
import { Worlds } from "./clients/worlds/sdk.ts";

/**
 * WorldsSdk is the main entry point for the Worlds API SDK.
 */
export class WorldsSdk {
  public readonly worlds: Worlds;
  public readonly invites: Invites;
  public readonly organizations: Organizations;

  public constructor(options: WorldsSdkOptions) {
    this.worlds = new Worlds(options);
    this.invites = new Invites(options);
    this.organizations = new Organizations(options);
  }
}
