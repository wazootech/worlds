import type {
  AuthOrganization,
  WorkOSManagement,
} from "./workos/workos-management";
import type { DeployManagement } from "./deploy/deploy-management";
import type { TursoManagement } from "./turso/turso-management";

// ═══════════════════════════════════════════════════════════════════════════
// Mode Detection
// ═══════════════════════════════════════════════════════════════════════════

/** True when WorkOS credentials are absent — local file-backed mode. */
export const isLocalDev = !process.env.WORKOS_CLIENT_ID;

// ═══════════════════════════════════════════════════════════════════════════
// Singleton Managers (lazy-initialized)
// ═══════════════════════════════════════════════════════════════════════════

let _workos: WorkOSManagement | null = null;
let _deploy: DeployManagement | null = null;
let _turso: TursoManagement | null = null;
let _initialized = false;

async function ensureManagers() {
  if (_initialized) return;

  // Turso – only when remote credentials are provided
  if (process.env.TURSO_API_TOKEN && process.env.TURSO_ORG) {
    const { RemoteTursoManagement } = await import("./turso/turso-management");
    _turso = new RemoteTursoManagement({
      token: process.env.TURSO_API_TOKEN,
      org: process.env.TURSO_ORG,
    });
  }

  // Deploy – local Deno serve by default, remote Deno Deploy when token is set
  if (isLocalDev) {
    const { LocalDeployManagement } =
      await import("./deploy/local/local-deploy-management");
    _deploy = LocalDeployManagement.getInstance();
  } else if (process.env.DENO_DEPLOY_TOKEN) {
    const { DenoDeployManagement } =
      await import("./deploy/deno-deploy-management");
    _deploy = new DenoDeployManagement();
  }

  _initialized = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// getWorkOS – Core Singleton Accessor
// ═══════════════════════════════════════════════════════════════════════════

export async function getWorkOS(
  opts: { skipCache?: boolean } = {},
): Promise<WorkOSManagement> {
  if (_workos && !opts.skipCache) return _workos;

  if (isLocalDev) {
    const { LocalWorkOSManagement } =
      await import("./workos/local/local-management");
    _workos = new LocalWorkOSManagement();
  } else {
    const { RemoteWorkOSManagement } =
      await import("./workos/remote-management");
    _workos = new RemoteWorkOSManagement();
  }

  return _workos;
}

// ═══════════════════════════════════════════════════════════════════════════
// provisionOrganization
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Provisions all platform resources for a newly created organization:
 *  1. Generates an API key
 *  2. Provisions a Turso database (if remote Turso credentials exist)
 *  3. Deploys the world API server (local deno serve or remote Deno Deploy)
 *  4. Persists apiBaseUrl, apiKey, and Turso URLs in org metadata
 *
 * Call after `workos.createOrganization()`.
 */
export async function provisionOrganization(
  orgId: string,
): Promise<{ url: string; apiKey: string }> {
  await ensureManagers();
  const workos = await getWorkOS();

  // 1. Generate an API key
  const prefix = isLocalDev ? "sk-local-" : "sk-live-";
  const apiKey = `${prefix}${crypto.randomUUID()}`;

  // 2. Persist the key before deploy (env vars reference it)
  const org = await workos.getOrganization(orgId);
  if (!org) throw new Error(`Organization not found: ${orgId}`);

  org.metadata = { ...org.metadata, apiKey };
  await workos.updateOrganization(orgId, { metadata: org.metadata });

  // 3. Deploy (includes Turso provisioning + metadata update)
  if (!_deploy) throw new Error("Deployment management not configured");
  const { url } = await deployOrganizationInternal(
    org,
    workos,
    _deploy,
    _turso,
  );

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
  await ensureManagers();

  if (_deploy) {
    try {
      await _deploy.stop(orgId);
    } catch (error) {
      console.error(
        `[platform] Failed to stop deployment for org ${orgId}:`,
        error,
      );
    }
  }

  if (_turso) {
    try {
      await _turso.deleteDatabase(orgId);
    } catch (error) {
      console.error(
        `[platform] Failed to delete Turso database for org ${orgId}:`,
        error,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// deployWorldApi
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Re-deploys an already-provisioned organization's server.
 * Unlike provisionOrganization, this does NOT generate a new API key.
 * Used for manual re-deploy actions from the UI.
 */
export async function deployWorldApi(orgId: string): Promise<{ url: string }> {
  await ensureManagers();
  const workos = await getWorkOS();

  if (!_deploy) throw new Error("Deployment management not configured");

  const org = await workos.getOrganization(orgId);
  if (!org) throw new Error(`Organization not found: ${orgId}`);

  return deployOrganizationInternal(org, workos, _deploy, _turso);
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal Helpers (not exported)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds the environment variables for a world-api server deployment.
 * Used by both local (deno serve) and remote (Deno Deploy) environments.
 */
function buildDeployEnvVars(opts: {
  org: AuthOrganization;
  port?: string;
  libsqlUrl?: string;
}): Record<string, string> {
  const { org, port, libsqlUrl } = opts;
  const envVars: Record<string, string> = {
    ADMIN_API_KEY: org.metadata?.apiKey || "",
    LIBSQL_URL: libsqlUrl || org.metadata?.libsqlUrl || "",
    LIBSQL_AUTH_TOKEN: org.metadata?.libsqlAuthToken || "",
  };

  if (port) envVars.PORT = port;

  if (org.metadata?.tursoApiToken)
    envVars.TURSO_API_TOKEN = org.metadata.tursoApiToken;
  if (org.metadata?.tursoOrg) envVars.TURSO_ORG = org.metadata.tursoOrg;

  // Pass along server-side secrets
  if (process.env.GOOGLE_API_KEY)
    envVars.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (process.env.GOOGLE_EMBEDDINGS_MODEL)
    envVars.GOOGLE_EMBEDDINGS_MODEL = process.env.GOOGLE_EMBEDDINGS_MODEL;

  return envVars;
}

/**
 * Auto-provision a Turso database for the organization if one hasn't
 * been configured yet. Mutates org.metadata and persists the update.
 */
async function provisionTursoIfNeeded(
  org: AuthOrganization,
  workos: WorkOSManagement,
  turso: TursoManagement | null | undefined,
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
      `[platform] Provisioned Turso database for org ${org.id}: ${db.url}`,
    );
  } catch (error) {
    console.error(
      `[platform] Failed to provision Turso database for org ${org.id}:`,
      error,
    );
  }
}

/**
 * Core deployment orchestration:
 *  1. Auto-provisions a Turso database if needed
 *  2. Allocates a local port (if local dev)
 *  3. Builds env vars and calls the deploy manager
 *  4. Updates org metadata with the deployment URL
 */
async function deployOrganizationInternal(
  org: AuthOrganization,
  workos: WorkOSManagement,
  deployManager: DeployManagement,
  turso?: TursoManagement | null,
): Promise<{ url: string }> {
  // Auto-provision Turso database if available
  await provisionTursoIfNeeded(org, workos, turso);

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

  const envVars = buildDeployEnvVars({ org, port, libsqlUrl });
  const deployment = await deployManager.deploy(org.id, envVars);

  // Update org metadata with the actual deployment URL
  org.metadata = { ...org.metadata, apiBaseUrl: deployment.url };
  await workos.updateOrganization(org.id, { metadata: org.metadata });

  return { url: deployment.url };
}
