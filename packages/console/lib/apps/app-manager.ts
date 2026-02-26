export interface ManagedApp {
  id: string;
  slug: string;
  url: string;
  status: "pending" | "running" | "failed" | "stopped";
  createdAt: string;
  updatedAt: string;
}

export interface AppManager {
  /**
   * Provisions a new app resource and performs the initial code deployment.
   */
  createApp(slug: string, envs: Record<string, string>): Promise<ManagedApp>;

  /**
   * Retrieves the current app status/info for the given appId.
   */
  getApp(appId: string): Promise<ManagedApp | null>;

  /**
   * Deletes the app resource and stops the server.
   */
  deleteApp(appId: string): Promise<void>;
}

/**
 * Shared utility to build environment variables for the worlds-server,
 * used across both local and remote deployments.
 */
export function buildWorldsEnvs(opts: {
  apiKey: string;
  libsqlUrl: string;
  libsqlAuthToken?: string;
  port?: string;
  tursoApiToken?: string;
  tursoOrg?: string;
  googleApiKey?: string;
  googleEmbeddingsModel?: string;
}): Record<string, string> {
  const envs: Record<string, string> = {
    ADMIN_API_KEY: opts.apiKey,
    LIBSQL_URL: opts.libsqlUrl,
    LIBSQL_AUTH_TOKEN: opts.libsqlAuthToken || "",
  };

  if (opts.port) envs.PORT = opts.port;
  if (opts.tursoApiToken) envs.TURSO_API_TOKEN = opts.tursoApiToken;
  if (opts.tursoOrg) envs.TURSO_ORG = opts.tursoOrg;
  if (opts.googleApiKey) envs.GOOGLE_API_KEY = opts.googleApiKey;
  if (opts.googleEmbeddingsModel)
    envs.GOOGLE_EMBEDDINGS_MODEL = opts.googleEmbeddingsModel;

  return envs;
}
