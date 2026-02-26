import { Sandbox, Client } from "@deno/sandbox";
import type { ManagedApp, AppManager } from "./app-manager";

interface DenoAppUpdate {
  envs?: Record<string, string>;
}

export class DenoAppManager implements AppManager {
  private client: Client;

  constructor() {
    this.client = new Client({
      token: process.env.DENO_DEPLOY_TOKEN,
    });
  }

  async createApp(
    slug: string,
    envs: Record<string, string>,
  ): Promise<ManagedApp> {
    const token = process.env.DENO_DEPLOY_TOKEN;
    if (!token) {
      throw new Error("DENO_DEPLOY_TOKEN is not set");
    }

    console.log(`[AppManager:Deno] Creating App ${slug} on Deno Deploy...`);
    const app = await this.client.apps.create({
      slug,
    });

    try {
      console.log(`[AppManager:Deno] Initializing Sandbox for deployment...`);
      await using sandbox = await Sandbox.create({
        token,
      });

      console.log(
        `[AppManager:Deno] Deploying application to ${app.slug}...`,
      );
      const build = await sandbox.deno.deploy(app.slug, {
        production: true,
        build: {
          // Use the direct JSR entrypoint as suggested in the memo
          entrypoint: "jsr:@wazoo/worlds-server",
        },
      });

      // Wait for the build and deployment revision to complete (with 2min timeout)
      await Promise.race([
        build.done,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Deployment timed out")), 120_000),
        ),
      ]);
      console.log(`[AppManager:Deno] Deployed revision successfully.`);

      // Inject environment variables into the app
      if (Object.keys(envs).length > 0) {
        console.log(
          `[AppManager:Deno] Injecting environment variables into ${app.slug}...`,
        );
        await this.client.apps.update(app.id, {
          envs,
        } as DenoAppUpdate as any);
      }

      const now = new Date().toISOString();
      return {
        id: app.id,
        slug: app.slug,
        url: `https://${app.slug}.deno.dev`,
        status: "running",
        createdAt: app.created_at,
        updatedAt: now,
      };
    } catch (error) {
      console.error(
        `[AppManager:Deno] Failed to provision app ${slug} (ID: ${app.id}):`,
        error,
      );
      
      // Clean up the partially created app to avoid "zombie" resources
      try {
        console.log(`[AppManager:Deno] Cleaning up failed app ${app.id}...`);
        await this.client.apps.delete(app.id);
      } catch (cleanupError) {
        console.error(
          `[AppManager:Deno] Failed to cleanup app ${app.id}:`,
          cleanupError,
        );
      }
      throw error;
    }
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
      console.error(`[AppManager:Deno] Failed to fetch app ${appId}:`, error);
      return null;
    }
  }

  async deleteApp(appId: string): Promise<void> {
    console.log(`[AppManager:Deno] Deleting app ${appId} (Deno Deploy)...`);
    await this.client.apps.delete(appId);
  }
}
