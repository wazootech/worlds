export interface Deploy {
  id: string;
  orgId: string;
  url: string;
  status: "pending" | "running" | "failed" | "stopped";
  createdAt: string;
  updatedAt: string;
}

export interface DeployManagement {
  /**
   * Deploys the server for the given organization.
   * If a deployment already exists and is running, it may return the existing one or restart it.
   */
  deploy(orgId: string, envVars: Record<string, string>): Promise<Deploy>;

  /**
   * Retrieves the current deployment for the given organization.
   */
  getDeployment(orgId: string): Promise<Deploy | null>;

  /**
   * Stops the deployment for the given organization.
   */
  stop(orgId: string): Promise<void>;
}
