import { Sandbox, Client } from "@deno/sandbox";
import type { Deploy, DeployManagement } from "./deploy-management";

export class DenoDeployManagement implements DeployManagement {
  private client: Client;

  constructor() {
    this.client = new Client({
      token: process.env.DENO_DEPLOY_TOKEN,
    });
  }

  async getDeployment(orgId: string): Promise<Deploy | null> {
    // In a full implementation we would query the Deno Deploy API or our DB mapping
    console.log(`[Deploy] Get deployment requested for org ${orgId}`);
    return null;
  }

  async stop(_orgId: string): Promise<void> {
    // In a full implementation we would delete the app or stop the project
    // For now, let's keep it as a no-op to avoid accidental deletions of production resources
    console.log(`[Deploy] Stop requested for org ${_orgId} (Deno Deploy)`);
  }

  async deploy(
    _orgId: string,
    envVars: Record<string, string>,
  ): Promise<Deploy> {
    const token = process.env.DENO_DEPLOY_TOKEN;
    if (!token) {
      throw new Error("DENO_DEPLOY_TOKEN is not set");
    }

    // We need the org metadata to check for an existing app
    // This is a bit of a circular dependency if we import getWorkOS here
    // but DenoDeployManagement is instantiated in auth.ts which has getWorkOS.
    // However, it's better to stay decoupled.
    // Let's assume for now we might want to pass metadata in envVars or similar,
    // or just fetch it here.
    const { getWorkOS } = await import("../platform");
    const workos = await getWorkOS();
    const org = await workos.getOrganization(_orgId);

    let appSlug = org?.metadata?.denoDeployAppSlug;
    let appId = org?.metadata?.denoDeployAppId;

    if (!appSlug) {
      appSlug = `worlds-api-${Math.random().toString(36).slice(2, 6)}`;
      console.log(`[Deploy] Creating App ${appSlug} on Deno Deploy...`);
      const app = await this.client.apps.create({
        slug: appSlug,
      });
      appId = app.id;

      // Update org metadata with the new app info
      if (org) {
        org.metadata = {
          ...org.metadata,
          denoDeployAppId: appId,
          denoDeployAppSlug: appSlug,
        };
        await workos.updateOrganization(_orgId, { metadata: org.metadata });
      }
    } else {
      console.log(
        `[Deploy] Reusing App ${appSlug} (${appId}) on Deno Deploy...`,
      );
    }

    console.log(`[Deploy] Creating Sandbox...`);
    await using sandbox = await Sandbox.create({ token });

    console.log(`[Deploy] Cloning repository into Sandbox...`);
    const cloneResult =
      await sandbox.sh`git clone https://github.com/wazootech/worlds.git /src`;
    if (!cloneResult.status.success) {
      throw new Error("Failed to clone repository: " + cloneResult.stderrText);
    }

    console.log(`[Deploy] Setting environment variables...`);
    for (const [key, value] of Object.entries(envVars)) {
      await sandbox.env.set(key, value);
    }

    console.log(`[Deploy] Deploying application from Sandbox...`);
    const build = await sandbox.deploy(appSlug, {
      path: "/src",
      build: {
        entrypoint: "packages/server/main.ts",
      },
    });

    // Wait for the build and deployment revision to complete
    await build.done;
    console.log(`[Deploy] Deployed revision successfully.`);

    const now = new Date().toISOString();
    return {
      id: appId!,
      orgId: _orgId,
      url: `https://${appSlug}.deno.dev`,
      status: "running",
      createdAt: now,
      updatedAt: now,
    };
  }
}
