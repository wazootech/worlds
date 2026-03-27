import type { WorldsSdkOptions } from "./options.ts";
import { WorldClient } from "./clients/worlds/sdk.ts";
import type { Worlds } from "./clients/worlds/types.ts";

/**
 * WorldsSdk is the main entry point for the Worlds API SDK.
 */
export class WorldsSdk {
  public readonly worlds: Worlds;

  public constructor(options: WorldsSdkOptions) {
    this.worlds = new WorldClient(options);
  }
}
