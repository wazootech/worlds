import type { WorldsSdkOptions } from "./options.ts";
import { Worlds } from "./clients/worlds/sdk.ts";

/**
 * WorldsSdk is the main entry point for the Worlds API SDK.
 */
export class WorldsSdk {
  public readonly worlds: Worlds;

  public constructor(options: WorldsSdkOptions) {
    this.worlds = new Worlds(options);
  }
}
