/**
 * AccountsService manages access control and authorization.
 */
export interface AccountsService {
  /**
   * set sets an account.
   */
  set(account: Account): Promise<void>;

  /**
   * get gets an account.
   */
  get(id: string): Promise<Account | null>;

  /**
   * remove removes an account.
   */
  remove(id: string): Promise<void>;

  /**
   * meter records a usage event and updates the account's usage summary.
   */
  meter(event: AccountUsageEvent): Promise<void>;

  /**
   * getUsageSummary retrieves the usage summary for an account.
   */
  getUsageSummary(accountId: string): Promise<AccountUsageSummary | null>;

  /**
   * listAccounts retrieves all accounts.
   */
  listAccounts(): Promise<Account[]>;
}

/**
 * Account is a service account.
 */
export interface Account {
  /**
   * id is the unique ID of the account.
   */
  id: string;

  /**
   * description is a user-defined description of the account.
   */
  description: string;

  /**
   * plan is the plan the account is on.
   */
  plan: AccountPlan;

  /**
   * accessControl is the access control list of resources for the account.
   */
  accessControl: AccountAccessControl;
}

/**
 * AccountPlan is the plan the account is on.
 */
export type AccountPlan = "free_plan" | "pro_plan";

/**
 * AccountAccessControl is the access control list of resources for an account.
 */
export interface AccountAccessControl {
  /**
   * worlds is a list of world IDs this account has access to.
   */
  worlds: string[];
}

/**
 * AccountUsageSummary is a summary of usage for an account. The system
 * manages this summary automatically enabling quick access to usage data.
 */
export interface AccountUsageSummary {
  worlds: {
    [worldId: string]: WorldUsageSummary;
  };
}

/**
 * WorldUsageSummary is a summary of usage for a world. The system
 * manages this summary automatically enabling quick access to usage data.
 */
export interface WorldUsageSummary {
  /**
   * reads is the total number of reads associated with the world.
   */
  reads: number;

  /**
   * writes is the total number of writes associated with the world.
   */
  writes: number;

  /**
   * queries is the total number of queries associated with the world.
   */
  queries: number;

  /**
   * updates is the total number of updates associated with the world.
   */
  updates: number;

  /**
   * updatedAt is the Unix timestamp in milliseconds the world was last updated.
   */
  updatedAt: number;
}

/**
 * AccountUsageEvent is a log entry for an event associated with an account.
 */
export interface AccountUsageEvent {
  /**
   * id is the unique ID of the event.
   */
  id: string;

  /**
   * accountId is the ID of the account associated with the event.
   */
  accountId: string;

  /**
   * timestamp is the Unix timestamp in milliseconds of the event.
   */
  timestamp: number;

  /**
   * endpoint is the method and pathname the event occurred on.
   */
  endpoint: AccountUsageEventEndpoint;

  /**
   * params is the parameters associated with the event.
   */
  params: Record<string, string>;

  /**
   * statusCode is the HTTP status code of the event.
   */
  statusCode: number;
}

/**
 * AccountUsageEventEndpoint is a valid HTTP method and pathname.
 */
type AccountUsageEventEndpoint =
  | "GET /worlds/{worldId}"
  | "POST /worlds/{worldId}"
  | "PUT /worlds/{worldId}"
  | "DELETE /worlds/{worldId}"
  | "GET /worlds/{worldId}/sparql"
  | "POST /worlds/{worldId}/sparql";
