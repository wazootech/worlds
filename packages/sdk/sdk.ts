import type { WorldsSdkOptions } from "./options.ts";
import { Organizations } from "./clients/organizations/sdk.ts";
import { Worlds } from "./clients/worlds/sdk.ts";

/**
 * WorldsSdk is the main entry point for the Worlds API SDK.
 */
export class WorldsSdk {
  public readonly worlds: Worlds;
  public readonly organizations: Organizations;

  public constructor(options: WorldsSdkOptions) {
    this.worlds = new Worlds(options);
    this.organizations = new Organizations(options);
  }
}
