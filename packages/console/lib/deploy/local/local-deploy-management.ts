import { spawn, type ChildProcess } from "child_process";
import path from "path";
import type { Deploy, DeployManagement } from "../deploy-management";
import type { AuthOrganization } from "../../workos/workos-management";

const PROCESS_PREFIX = "worlds";

function processName(orgId: string) {
  return `${PROCESS_PREFIX}-${orgId}`;
}

// ── LocalDeployManagement ──────────────────────────────────────────────────

export class LocalDeployManagement implements DeployManagement {
  private static instance: LocalDeployManagement | null = null;
  private processes = new Map<string, ChildProcess>();
  private ports = new Map<string, string>();

  static getInstance(): LocalDeployManagement {
    if (!LocalDeployManagement.instance) {
      LocalDeployManagement.instance = new LocalDeployManagement();
    }
    return LocalDeployManagement.instance;
  }

  async deploy(
    orgId: string,
    envVars: Record<string, string>,
  ): Promise<Deploy> {
    const name = processName(orgId);

    // If already running, return existing deployment info
    const existing = this.processes.get(name);
    if (existing && existing.exitCode === null) {
      const port = envVars.PORT || "80";
      const url = `http://localhost:${port}`;
      const now = new Date().toISOString();
      return {
        id: name,
        orgId,
        url,
        status: "running",
        createdAt: now,
        updatedAt: now,
      };
    }

    const port = envVars.PORT || "80";
    const serverDir = path.resolve(process.cwd(), "..", "server");

    console.log(`[local-deploy] Starting ${name} on port ${port}...`);
    const child = spawn(
      "deno",
      ["serve", "-A", "--env", "--port", port, "main.ts"],
      {
        cwd: serverDir,
        env: { ...process.env, ...envVars } as NodeJS.ProcessEnv,
        stdio: "pipe",
      },
    );

    child.stdout?.on("data", (data: Buffer) => {
      process.stdout.write(`[${name}] ${data}`);
    });
    child.stderr?.on("data", (data: Buffer) => {
      process.stderr.write(`[${name}] ${data}`);
    });

    child.on("exit", (code) => {
      console.log(`[local-deploy] ${name} exited with code ${code}`);
      this.processes.delete(name);
      this.ports.delete(orgId);
    });

    this.processes.set(name, child);
    this.ports.set(orgId, port);

    const url = `http://localhost:${port}`;
    const now = new Date().toISOString();
    return {
      id: name,
      orgId,
      url,
      status: "running",
      createdAt: now,
      updatedAt: now,
    };
  }

  async getDeployment(orgId: string): Promise<Deploy | null> {
    const name = processName(orgId);
    const child = this.processes.get(name);

    if (!child || child.exitCode !== null) return null;

    const now = new Date().toISOString();
    const port = this.ports.get(orgId) || "80";
    const url = `http://localhost:${port}`;

    return {
      id: name,
      orgId,
      url,
      status: "running",
      createdAt: now,
      updatedAt: now,
    };
  }

  async stop(orgId: string): Promise<void> {
    const name = processName(orgId);
    const child = this.processes.get(name);
    if (child) {
      console.log(`[local-deploy] Stopping ${name}...`);
      child.kill("SIGTERM");
      this.processes.delete(name);
      this.ports.delete(orgId);
    }
  }

  /**
   * Start Deno server processes for all local organizations.
   * Called from instrumentation.ts on Next.js startup.
   */
  async bootAll(orgs: AuthOrganization[]): Promise<void> {
    console.log(
      `[local-deploy] Booting ${orgs.length} local organization(s)...`,
    );
    for (const org of orgs) {
      try {
        const apiBaseUrl = org.metadata?.apiBaseUrl as string | undefined;
        const isRemote =
          apiBaseUrl &&
          !apiBaseUrl.startsWith("http://localhost") &&
          !apiBaseUrl.startsWith("http://127.0.0.1");

        if (isRemote) {
          console.log(
            `[local-deploy] Skipping ${org.id} — points to remote API (${apiBaseUrl}).`,
          );
          continue;
        }

        if (!apiBaseUrl) {
          console.warn(
            `[local-deploy] Skipping ${org.id} — no apiBaseUrl assigned.`,
          );
          continue;
        }

        const parsedUrl = new URL(apiBaseUrl);
        const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 80;

        if (!port) {
          console.warn(
            `[local-deploy] Skipping ${org.id} — no port could be parsed.`,
          );
          continue;
        }

        // Store data in packages/console/data to keep server stateless locally
        const dataDir = path.resolve(process.cwd(), "data", org.id);

        const envVars: Record<string, string> = {
          ADMIN_API_KEY:
            (org.metadata?.apiKey as string) || "default-local-key",
          PORT: port.toString(),
          LIBSQL_URL:
            (org.metadata?.libsqlUrl as string) ||
            `file:${path.join(dataDir, "worlds.db")}`,
          LIBSQL_AUTH_TOKEN: (org.metadata?.libsqlAuthToken as string) || "",
          WORLDS_BASE_DIR: path.join(dataDir, "worlds"),
        };

        if (org.metadata?.tursoApiToken) {
          envVars.TURSO_API_TOKEN = org.metadata.tursoApiToken as string;
        }
        if (org.metadata?.tursoOrg) {
          envVars.TURSO_ORG = org.metadata.tursoOrg as string;
        }
        if (process.env.GOOGLE_API_KEY) {
          envVars.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        }
        if (process.env.GOOGLE_EMBEDDINGS_MODEL) {
          envVars.GOOGLE_EMBEDDINGS_MODEL = process.env.GOOGLE_EMBEDDINGS_MODEL;
        }

        await this.deploy(org.id, envVars);
      } catch (e) {
        console.error(`[local-deploy] Failed to boot org ${org.id}:`, e);
      }
    }
    console.log("[local-deploy] All organizations booted.");
  }

  /**
   * Kill all managed child processes.
   * Called on SIGINT/SIGTERM during shutdown.
   */
  shutdownAll(): void {
    console.log(
      `\n[local-deploy] Shutting down ${this.processes.size} server(s)...`,
    );
    for (const [name, child] of this.processes.entries()) {
      console.log(`[local-deploy] Killing ${name}`);
      child.kill("SIGTERM");
    }
    this.processes.clear();
    this.ports.clear();
    console.log("[local-deploy] Shutdown complete.");
  }

  /**
   * Register SIGINT/SIGTERM handlers to clean up child processes.
   * Called from instrumentation.ts — kept here so process.on/process.exit
   * are never statically visible to the Edge Runtime bundler.
   */
  registerShutdownHooks(): void {
    const shutdown = () => {
      this.shutdownAll();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}
