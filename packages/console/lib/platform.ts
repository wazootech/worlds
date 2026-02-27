import { retry } from "@std/async/retry";
import type { WorkOSOrganization, WorkOSManager } from "./workos/workos-manager";
import { type AppManager, buildWorldsEnvs } from "./apps/app-manager";
import type { TursoManager } from "./turso/turso-manager";

// ═══════════════════════════════════════════════════════════════════════════
// Platform Access
// ═══════════════════════════════════════════════════════════════════════════

export const platform = {
  get workos() {
    return getWorkOS();
  },
  get apps() {
    return getApps();
  },
  get turso() {
    return getTurso();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Mode Detection
// ═══════════════════════════════════════════════════════════════════════════

/** True when WorkOS credentials are absent — local file-backed mode. */
export const isLocalDev = !process.env.WORKOS_CLIENT_ID;

// ═══════════════════════════════════════════════════════════════════════════
// Singleton Accessors (self-initializing)
// ═══════════════════════════════════════════════════════════════════════════

let _workos: WorkOSManager | null = null;
let _appManager: AppManager | null = null;
let _turso: TursoManager | null = null;

export async function getWorkOS(): Promise<WorkOSManager> {
  if (_workos) return _workos;

  if (isLocalDev) {
    const { localWorkOSManager } = await import("./workos/local/local-manager");
    _workos = localWorkOSManager;
  } else {
    const { RemoteWorkOSManager } = await import("./workos/remote-manager");
    _workos = new RemoteWorkOSManager();
  }

  return _workos;
}

export async function getApps(): Promise<AppManager> {
  if (_appManager) return _appManager;

  if (isLocalDev) {
    const { localAppManager } = await import("./apps/local/local-app-manager");
    _appManager = localAppManager;
  } else if (process.env.DENO_DEPLOY_TOKEN) {
    const { DenoAppManager } = await import("./apps/deno-app-manager");
    _appManager = new DenoAppManager();
  } else {
    throw new Error("App management not configured");
  }

  if (!_appManager) {
    throw new Error("App management not configured");
  }

  return _appManager;
}

export async function getTurso(): Promise<TursoManager | null> {
  if (_turso) return _turso;

  if (process.env.TURSO_API_TOKEN && process.env.TURSO_ORG) {
    const { RemoteTursoManager } = await import("./turso/turso-manager");
    _turso = new RemoteTursoManager({
      token: process.env.TURSO_API_TOKEN,
      org: process.env.TURSO_ORG,
    });
  }

  return _turso;
}

// ═══════════════════════════════════════════════════════════════════════════
// provisionOrganization
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Provisions all platform resources for a newly created organization:
 *  1. Generates an API key
 *  2. Provisions a Turso database (if remote Turso credentials exist)
 *  3. Deploys the Worlds API Server (local deno serve or remote Deno Deploy)
 *  4. Persists apiBaseUrl, apiKey, and Turso URLs in org metadata
 *
 * Call after `workos.createOrganization()`.
 */
export async function provisionOrganization(
  orgId: string,
): Promise<{ url: string; apiKey: string }> {
  const workos = await getWorkOS();

  // 1. Generate an API key
  const prefix = isLocalDev ? "sk-local-" : "sk-live-";
  const apiKey = `${prefix}${crypto.randomUUID()}`;

  // 2. Persist the key before deploy (env vars reference it)
  const org = await workos.getOrganization(orgId);
  if (!org) throw new Error(`Organization not found: ${orgId}`);

  org.metadata = { ...org.metadata, apiKey };
  await workos.updateOrganization(orgId, { metadata: org.metadata });

  // 3. Provision App (includes code deployment)
  const { url } = await provisionAppInternal(org);

  return { url, apiKey };
}

// ═══════════════════════════════════════════════════════════════════════════
// teardownOrganization
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tears down all platform resources for an organization:
 *  1. Stops the deployment (local process or remote app)
 *  2. Deletes the Turso database (if remote Turso is configured)
 *
 * Call before `workos.deleteOrganization()`.
 * Local SQLite files in the data/ directory are preserved.
 */
export async function teardownOrganization(orgId: string): Promise<void> {
  const [workos, appManager, turso] = await Promise.all([
    getWorkOS(),
    getApps(),
    getTurso(),
  ]);

  const org = await workos.getOrganization(orgId);

  if (appManager && org) {
    try {
      const appId = org.metadata?.denoDeployAppId || org.id;
      if (appId) {
        await appManager.deleteApp(appId as string);
      }
    } catch (error) {
      console.error(`[Platform] Failed to delete app for org ${orgId}:`, error);
    }
  }

  if (turso) {
    try {
      await turso.deleteDatabase(orgId);
    } catch (error) {
      console.error(
        `[Platform] Failed to delete Turso database for org ${orgId}:`,
        error,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal Helpers (not exported)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds the environment variables for a world-api server deployment.
 * Used by both local (deno serve) and remote (Deno Deploy) environments.
 */
function buildDeployEnvs(opts: {
  org: WorkOSOrganization;
  port?: string;
  libsqlUrl?: string;
}): Record<string, string> {
  const { org, port, libsqlUrl } = opts;
  return buildWorldsEnvs({
    apiKey: org.metadata?.apiKey || "",
    libsqlUrl: libsqlUrl || org.metadata?.libsqlUrl || "",
    libsqlAuthToken: org.metadata?.libsqlAuthToken || "",
    port,
    tursoApiToken: org.metadata?.tursoApiToken,
    tursoOrg: org.metadata?.tursoOrg,
    openRouterApiKey:
      org.metadata?.openRouterApiKey || process.env.OPENROUTER_API_KEY,
    embeddingsDimensions: process.env.WORLDS_EMBEDDINGS_DIMENSIONS,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaEmbeddingsModel: process.env.OLLAMA_EMBEDDINGS_MODEL,
  });
}

/**
 * Auto-provision a Turso database for the organization if one hasn't
 * been configured yet. Mutates org.metadata and persists the update.
 */
async function provisionTursoIfNeeded(
  org: WorkOSOrganization,
  workos: WorkOSManager,
  turso: TursoManager | null | undefined,
): Promise<void> {
  if (!turso || org.metadata?.libsqlUrl) return;

  try {
    const db = await turso.createDatabase(org.id);
    org.metadata = {
      ...org.metadata,
      libsqlUrl: db.url,
      libsqlAuthToken: db.authToken,
    };
    await workos.updateOrganization(org.id, { metadata: org.metadata });
    console.log(
      `[Platform] Provisioned Turso database for org ${org.id}: ${db.url}`,
    );
  } catch (error) {
    console.error(
      `[Platform] Failed to provision Turso database for org ${org.id}:`,
      error,
    );
  }
}

/**
 * Programmatically generates a new OpenRouter API key using the Management API.
 * Requires OPENROUTER_MANAGEMENT_KEY to be set in the environment.
 */
async function generateOpenRouterKey(name: string): Promise<string> {
  const managementKey = process.env.OPENROUTER_MANAGEMENT_KEY;
  if (!managementKey) {
    throw new Error("OPENROUTER_MANAGEMENT_KEY is not set");
  }

  console.log(`[Platform] Generating OpenRouter API key for: ${name}...`);
  const response = await fetch("https://openrouter.ai/api/v1/keys", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${managementKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Platform] OpenRouter Key Generation Failed:`, errorBody);
    throw new Error(
      `Failed to generate OpenRouter key: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.key;
}

/**
 * Core provisioning orchestration:
 *  1. Auto-provisions a Turso database if needed
 *  2. Allocates a local port (if local dev)
 *  3. Builds env vars and calls the app manager to create/deploy
 *  4. Updates org metadata with the app identifier and URL
 */
async function provisionAppInternal(
  org: WorkOSOrganization,
): Promise<{ url: string }> {
  const [workos, appManager, turso] = await Promise.all([
    getWorkOS(),
    getApps(),
    getTurso(),
  ]);

  // Auto-provision Turso database if available
  await provisionTursoIfNeeded(org, workos, turso);

  // Auto-provision OpenRouter API key if management key exists and no key is set
  if (
    process.env.OPENROUTER_MANAGEMENT_KEY &&
    !org.metadata?.openRouterApiKey
  ) {
    try {
      const orKey = await generateOpenRouterKey(`Worlds App: ${org.name}`);
      org.metadata = {
        ...org.metadata,
        openRouterApiKey: orKey,
      };
      await workos.updateOrganization(org.id, { metadata: org.metadata });
      console.log(`[Platform] Provisioned per-app OpenRouter key for ${org.id}`);
    } catch (error) {
      console.error(
        `[Platform] Failed to provision OpenRouter key for ${org.id}:`,
        error,
      );
      // We don't throw here to allow deployment to proceed with fallback if possible
    }
  }

  // Determine local SQLite fallback if no remote DB exists
  const localDbUrl = `file:./data/${org.id}/worlds.db`;
  const libsqlUrl = org.metadata?.libsqlUrl || localDbUrl;

  const currentApiUrl = org.metadata?.apiBaseUrl;
  const isLocal =
    !currentApiUrl ||
    currentApiUrl.startsWith("http://localhost") ||
    currentApiUrl.startsWith("http://127.0.0.1");

  let port: string | undefined;

  if (isLocal) {
    // Allocate an available port, excluding ports already assigned to other orgs
    const { data: allOrgs } = await workos.listOrganizations({ limit: 100 });
    const usedPorts = allOrgs
      .map((o) => o.metadata?.apiBaseUrl)
      .filter((u): u is string => !!u && u.startsWith("http://localhost"))
      .map((u) => {
        try {
          return parseInt(new URL(u).port, 10);
        } catch {
          return NaN;
        }
      })
      .filter((p) => !isNaN(p));

    const getPort = (await import("get-port")).default;
    const allocatedPort = await getPort({
      port: currentApiUrl ? parseInt(new URL(currentApiUrl).port, 10) : 8001,
      exclude: usedPorts,
    });
    port = allocatedPort.toString();
  }

  const envs = buildDeployEnvs({ org, port, libsqlUrl });

  // If app already exists, we skip creation logic per user preference
  let appId = org.metadata?.denoDeployAppId as string;
  let url = org.metadata?.apiBaseUrl as string;

  if (!appId) {
    const app = await retry(
      async () => {
        const slug = isLocalDev
          ? org.slug
          : `${org.slug}-${Math.random().toString(36).slice(2, 6)}`;

        try {
          return await appManager.createApp(slug, envs);
        } catch (error: any) {
          const isConflict =
            error?.status === 409 ||
            error?.message?.includes("409") ||
            error?.message?.includes("already exists");

          if (isConflict) {
            console.warn(`[Platform] Slug collision for ${slug}, retrying...`);
            throw error; // Rethrow to trigger retry
          }
          throw error; // Rethrow other errors
        }
      },
      {
        maxAttempts: 3,
        minTimeout: 0, // Retry immediately for collisions
      },
    );

    appId = app.id;
    url = app.url;

    // Update org metadata with the new app info
    org.metadata = {
      ...org.metadata,
      denoDeployAppId: appId,
      apiBaseUrl: url,
    };
    await workos.updateOrganization(org.id, { metadata: org.metadata });
  } else {
    console.log(
      `[Platform] App ${appId} already provisioned for org ${org.id}`,
    );
  }

  return { url };
}
