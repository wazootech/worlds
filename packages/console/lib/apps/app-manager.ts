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
  createApp(slug: string, envVars: Record<string, string>): Promise<ManagedApp>;

  /**
   * Retrieves the current app status/info for the given appId.
   */
  getApp(appId: string): Promise<ManagedApp | null>;

  /**
   * Deletes the app resource and stops the server.
   */
  deleteApp(appId: string): Promise<void>;
}
