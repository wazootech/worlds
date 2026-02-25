/**
 * WorldsSdkOptions are the options for the Worlds API SDK.
 */
export interface WorldsSdkOptions {
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
