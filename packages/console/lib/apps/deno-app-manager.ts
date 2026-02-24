import { Sandbox, Client } from "@deno/sandbox";
import type { ManagedApp, AppManager } from "./app-manager";

export class DenoAppManager implements AppManager {
  private client: Client;

  constructor() {
    this.client = new Client({
      token: process.env.DENO_DEPLOY_TOKEN,
    });
  }

  async createApp(
    slug: string,
    envVars: Record<string, string>,
  ): Promise<ManagedApp> {
    const token = process.env.DENO_DEPLOY_TOKEN;
    if (!token) {
      throw new Error("DENO_DEPLOY_TOKEN is not set");
    }

    console.log(`[App] Creating App ${slug} on Deno Deploy...`);
    const app = await this.client.apps.create({
      slug,
    });

    console.log(`[App] Initializing Sandbox for deployment...`);
    await using sandbox = await Sandbox.create({ token });

    console.log(`[App] Cloning repository into Sandbox...`);
    const cloneResult =
      await sandbox.sh`git clone https://github.com/wazootech/worlds.git /src`;
    if (!cloneResult.status.success) {
      throw new Error("Failed to clone repository: " + cloneResult.stderrText);
    }

    console.log(`[App] Setting environment variables...`);
    for (const [key, value] of Object.entries(envVars)) {
      await sandbox.env.set(key, value);
    }

    console.log(`[App] Deploying application from Sandbox to ${app.slug}...`);
    const build = await sandbox.deploy(app.slug, {
      path: "/src",
      build: {
        entrypoint: "packages/server/main.ts",
      },
    });

    // Wait for the build and deployment revision to complete
    await build.done;
    console.log(`[App] Deployed revision successfully.`);

    const now = new Date().toISOString();
    return {
      id: app.id,
      slug: app.slug,
      url: `https://${app.slug}.deno.dev`,
      status: "running",
      createdAt: app.created_at,
      updatedAt: now,
    };
  }

  async getApp(appId: string): Promise<ManagedApp | null> {
    try {
      const app = await this.client.apps.get(appId);
      if (!app) return null;

      return {
        id: app.id,
        slug: app.slug,
        url: `https://${app.slug}.deno.dev`,
        status: "running",
        createdAt: app.created_at,
        updatedAt: app.updated_at,
      };
    } catch (error) {
      console.error(`[App] Failed to fetch app ${appId}:`, error);
      return null;
    }
  }

  async deleteApp(appId: string): Promise<void> {
    console.log(`[App] Deleting app ${appId} (Deno Deploy)`);
    // Placeholder: Sandbox SDK apps.get(id).delete() or similar
  }
}
