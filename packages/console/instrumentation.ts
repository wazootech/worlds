/**
 * Next.js instrumentation hook.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * In local dev mode, this boots Deno servers for every organisation
 * in workos.json so they're available as soon as `next dev` starts.
 *
 * Next.js compiles this file for BOTH Node.js and Edge runtimes.
 * All Node-only imports (child_process, fs, path) MUST be dynamically
 * imported inside register() behind the runtime check so the Edge
 * bundle never tries to resolve them.
 */
export async function register() {
  // Only run in local dev mode (no WorkOS)
  if (process.env.WORKOS_CLIENT_ID) return;

  // Only run on the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { localAppManager } =
    await import("./lib/apps/local/local-app-manager");
  const { localWorkOSManager } =
    await import("./lib/workos/local/local-manager");

  const appManager = localAppManager;
  const orgManager = localWorkOSManager;
  const { data: orgs } = await orgManager.listOrganizations();

  if (orgs.length > 0) {
    await appManager.bootAll(orgs);
  } else {
    console.log("[local-app] No local organizations found. Skipping boot.");
  }

  // Register shutdown hooks from within the Node-only module
  appManager.registerShutdownHooks();
}
