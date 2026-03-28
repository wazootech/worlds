import type { WorldsInterface } from "./clients/worlds/types.ts";

/**
 * WorldsOptions are the options for the Worlds API SDK.
 */
export interface WorldsOptions {
  /**
   * driver is an optional local driver for the Worlds API.
   * If provided, the SDK will use this driver instead of making remote requests.
   */
  driver?: WorldsInterface;
  /**
   * baseUrl is the base URL of the Worlds API. It should not include the /v1 suffix.
   */
  baseUrl: string;

  /**
   * apiKey is the API key for the Worlds API.
   */
  apiKey: string;

  /**
   * fetch fetches a resource from the network. It returns a `Promise` that
   * resolves to the `Response` to that `Request`, whether it is successful
   * or not.
   */
  fetch?: typeof globalThis.fetch;
}
