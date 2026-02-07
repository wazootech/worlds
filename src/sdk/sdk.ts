import type { WorldsSdkOptions } from "./interfaces.ts";
import { Invites } from "./invites/sdk.ts";
import { Metrics } from "./metrics/sdk.ts";
import { Organizations } from "./organizations/sdk.ts";
import { ServiceAccounts } from "./service-accounts/sdk.ts";
import { Worlds } from "./worlds/sdk.ts";

/**
 * WorldsSdk is the main entry point for the Worlds API SDK.
 */
export class WorldsSdk {
  public readonly worlds: Worlds;
  public readonly invites: Invites;
  public readonly organizations: Organizations;
  public readonly serviceAccounts: ServiceAccounts;
  public readonly metrics: Metrics;

  public constructor(options: WorldsSdkOptions) {
    this.worlds = new Worlds(options);
    this.invites = new Invites(options);
    this.organizations = new Organizations(options);
    this.serviceAccounts = new ServiceAccounts(options);
    this.metrics = new Metrics(options);
  }
}
