import { Accounts } from "./accounts.ts";
import { Plans } from "./plans.ts";
import type { WorldsOptions } from "./worlds.ts";
import { WorldsAPI } from "./worlds.ts";

/**
 * InternalWorlds is a TypeScript SDK for internal/owner-only operations
 * on the Worlds API.
 */
export class InternalWorlds {
  public readonly accounts: Accounts;
  public readonly plans: Plans;
  public readonly worlds: WorldsAPI;

  public constructor(options: WorldsOptions) {
    // Initialize internal SDK modules.
    this.accounts = new Accounts(options);
    this.plans = new Plans(options);

    // Initialize public SDK modules.
    this.worlds = new WorldsAPI(options);
  }
}
