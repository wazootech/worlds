import { type ChildProcess } from "child_process";
import path from "path";
import { type ManagedApp, type AppManager, buildWorldsEnvs } from "../app-manager";
import type { WorkOSOrganization } from "../../workos/workos-manager";

const PROCESS_PREFIX = "worlds";

function processName(appId: string) {
  return `${PROCESS_PREFIX}-${appId}`;
}

export class LocalAppManager implements AppManager {
  private processes = new Map<string, ChildProcess>();
  private ports = new Map<string, string>();

  async createApp(
    appId: string,
    envs: Record<string, string>,
  ): Promise<ManagedApp> {
    const name = processName(appId);
    const port = envs.PORT || "80";
    const serverDir = path.resolve(process.cwd(), "..", "server");

    console.log(`[local-app] Starting ${name} on port ${port}...`);
    const { spawn } = await import("child_process");
    const child = spawn(
      "deno",
      ["serve", "-A", "--env", "--port", port, "main.ts"],
      {
        cwd: serverDir,
        env: { ...process.env, ...envs } as NodeJS.ProcessEnv,
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
      console.log(`[local-app] ${name} exited with code ${code}`);
      this.processes.delete(name);
      this.ports.delete(appId);
    });

    this.processes.set(name, child);
    this.ports.set(appId, port);

    const url = `http://localhost:${port}`;
    const now = new Date().toISOString();
    return {
      id: appId,
      slug: appId,
      url,
      status: "running",
      createdAt: now,
      updatedAt: now,
    };
  }

  async getApp(appId: string): Promise<ManagedApp | null> {
    const name = processName(appId);
    const child = this.processes.get(name);

    if (!child || child.exitCode !== null) return null;

    const now = new Date().toISOString();
    const port = this.ports.get(appId) || "80";
    const url = `http://localhost:${port}`;

    return {
      id: appId,
      slug: appId,
      url,
      status: "running",
      createdAt: now,
      updatedAt: now,
    };
  }

  async deleteApp(appId: string): Promise<void> {
    const name = processName(appId);
    const child = this.processes.get(name);
    if (child) {
      console.log(`[local-app] Stopping ${name}...`);
      child.kill("SIGTERM");
      this.processes.delete(name);
      this.ports.delete(appId);
    }
  }

  /**
   * Start Deno server processes for all local organizations.
   * Called from instrumentation.ts on Next.js startup.
   */
  async bootAll(orgs: WorkOSOrganization[]): Promise<void> {
    console.log(`[local-app] Booting ${orgs.length} local organization(s)...`);
    for (const org of orgs) {
      try {
        const apiBaseUrl = org.metadata?.apiBaseUrl as string | undefined;
        const isRemote =
          apiBaseUrl &&
          !apiBaseUrl.startsWith("http://localhost") &&
          !apiBaseUrl.startsWith("http://127.0.0.1");

        if (isRemote) {
          console.log(
            `[local-app] Skipping ${org.id} — points to remote API (${apiBaseUrl}).`,
          );
          continue;
        }

        if (!apiBaseUrl) {
          console.warn(
            `[local-app] Skipping ${org.id} — no apiBaseUrl assigned.`,
          );
          continue;
        }

        const parsedUrl = new URL(apiBaseUrl);
        const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 80;

        if (!port) {
          console.warn(
            `[local-app] Skipping ${org.id} — no port could be parsed.`,
          );
          continue;
        }

        const dataDir = path.resolve(process.cwd(), "data", org.id);

        const envs = buildWorldsEnvs({
          apiKey: (org.metadata?.apiKey as string) || "default-local-key",
          libsqlUrl:
            (org.metadata?.libsqlUrl as string) ||
            `file:${path.join(dataDir, "worlds.db")}`,
          libsqlAuthToken: (org.metadata?.libsqlAuthToken as string) || "",
          port: port.toString(),
          tursoApiToken: org.metadata?.tursoApiToken as string,
          tursoOrg: org.metadata?.tursoOrg as string,
          googleApiKey: process.env.GOOGLE_API_KEY,
          googleEmbeddingsModel: process.env.GOOGLE_EMBEDDINGS_MODEL,
        });

        await this.createApp(org.id, envs);
      } catch (e) {
        console.error(`[local-app] Failed to boot org ${org.id}:`, e);
      }
    }
    console.log("[local-app] All organizations booted.");
  }

  shutdownAll(): void {
    console.log(
      `\n[local-app] Shutting down ${this.processes.size} server(s)...`,
    );
    for (const [name, child] of this.processes.entries()) {
      console.log(`[local-app] Killing ${name}`);
      child.kill("SIGTERM");
    }
    this.processes.clear();
    this.ports.clear();
    console.log("[local-app] Shutdown complete.");
  }

  registerShutdownHooks(): void {
    const shutdown = () => {
      this.shutdownAll();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}

export const localAppManager = new LocalAppManager();
