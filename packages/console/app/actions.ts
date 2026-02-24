"use server";

import { revalidatePath } from "next/cache";
import { withAuth, signOut, type AuthUser } from "@/lib/auth";
import {
  getWorkOS,
  provisionOrganization,
  teardownOrganization,
} from "@/lib/platform";

import { getSdkForOrg } from "@/lib/sdk";

async function getActiveOrgId(user: AuthUser) {
  return user.metadata?.activeOrganizationId as string | undefined;
}

export async function signOutAction() {
  await signOut();
}

export async function updateWorld(
  organizationId: string,
  worldId: string,
  updates: { label?: string; slug?: string; description?: string },
) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workos = await getWorkOS();
  const organization = await workos.getOrganization(organizationId);
  if (!organization) throw new Error("Organization not found");
  const sdk = getSdkForOrg(organization);

  // Resolve world to ensure we have the actual ID for mutation
  const world = await sdk.worlds.get(worldId);
  if (!world) {
    throw new Error("World not found");
  }

  await sdk.worlds.update(world.id, updates);

  const [resolvedWorld] = await Promise.all([sdk.worlds.get(world.id)]);

  if (resolvedWorld && organization) {
    const orgSlug = organization.slug || organization.id;
    const worldSlug = resolvedWorld.slug || resolvedWorld.id;
    revalidatePath(`/organizations/${orgSlug}`);
    revalidatePath(`/organizations/${orgSlug}/worlds/${worldSlug}`);
  }
}

export async function deleteWorld(organizationId: string, worldId: string) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workos = await getWorkOS();
  const organization = await workos.getOrganization(organizationId);
  if (!organization) throw new Error("Organization not found");
  const sdk = getSdkForOrg(organization);

  // Resolve world to ensure we have the actual ID for mutation
  const world = await sdk.worlds.get(worldId);
  if (!world) {
    throw new Error("World not found");
  }

  await sdk.worlds.delete(world.id);
  // Re-fetch organization to ensure we have the slug (since we might have just used ID above? No, we have the object)
  if (organization) {
    const orgSlug = organization.slug || organization.id;
    revalidatePath(`/organizations/${orgSlug}`);
  }
}

export async function createWorld(
  organizationId: string,
  label: string,
  slug: string,
) {
  try {
    const { user } = await withAuth();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Resolve organization via WorkOSManager
    const workos = await getWorkOS();

    // The frontend might pass either an internal ID or an external slug
    let organization = await workos.getOrganization(organizationId);
    if (!organization) {
      // Fallback to checking by externalId (slug)
      organization = await workos.getOrganizationBySlug(organizationId);
    }

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Bootstrap: If no API config, try to provision one using Admin Key
    if (!organization.metadata?.apiBaseUrl || !organization.metadata?.apiKey) {
      // Only allowed if we have ADMIN_API_KEY
      const ADMIN_KEY = process.env.ADMIN_API_KEY;
      if (!ADMIN_KEY) {
        throw new Error(
          "Organization has no API config and no Admin Key available to provision one.",
        );
      }
      // Default URL
      const DEFAULT_URL =
        process.env.DEFAULT_API_URL || "http://localhost:8000";

      const { WorldsSdk } = await import("@wazoo/sdk");
      new WorldsSdk({
        baseUrl: DEFAULT_URL,
        apiKey: ADMIN_KEY,
      });

      const newApiKey = `sk_live_${Math.random().toString(36).substring(2, 15)}`;

      // Save to Org Metadata
      await workos.updateOrganization(organization.id, {
        metadata: {
          apiBaseUrl: DEFAULT_URL,
          apiKey: newApiKey,
        },
      });

      // Reload organization
      const updatedOrg = await workos.getOrganization(organization.id);
      if (updatedOrg) {
        Object.assign(organization, updatedOrg);
      }
    }

    const sdk = getSdkForOrg(organization);

    const actualOrgId = organization.id;
    const orgSlug = organization.slug || organization.id;

    console.log("Creating new world...", {
      organizationId: actualOrgId,
      label,
      slug,
    });
    const world = await sdk.worlds.create({
      label,
      slug,
    });

    console.log("World created successfully:", world.id);

    // Artificial delay to allow for eventual consistency in DB
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/organizations/${actualOrgId}`);
    revalidatePath(`/organizations/${orgSlug}`);

    return { success: true, worldId: world.id, slug: world.slug };
  } catch (error) {
    console.error("Failed to create world:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteOrganization(organizationId: string) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workos = await getWorkOS();
  const organization = await workos.getOrganization(organizationId);

  if (!organization) {
    throw new Error("Organization not found");
  }

  const sdk = getSdkForOrg(organization);

  // 1. Cleanup all worlds in this organization (best effort)
  try {
    const worlds = await sdk.worlds.list({
      page: 1,
      pageSize: 100,
    });
    for (const world of worlds) {
      try {
        await sdk.worlds.delete(world.id);
      } catch (e) {
        console.error(`Failed to cleanup world ${world.id}:`, e);
      }
    }
  } catch (error) {
    console.warn("Failed to list worlds for cleanup (ignoring):", error);
  }

  // 2. Tear down platform resources (deployment, Turso DB)
  await teardownOrganization(organization.id);

  // 3. Remove the organization via WorkOS
  await workos.deleteOrganization(organization.id);

  revalidatePath("/");

  // 4. If this was the active organization, clear it from metadata
  const activeOrgId = await getActiveOrgId(user);
  if (activeOrgId === organizationId) {
    await workos.updateUser(user.id, {
      metadata: {
        ...user.metadata,
        activeOrganizationId: "",
      },
    });
  }

  await signOut();
  return { success: true };
}

export async function rotateApiKey(organizationId: string) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workos = await getWorkOS();
  const organization = await workos.getOrganization(organizationId);
  if (!organization) throw new Error("Organization not found");

  // Generate new key
  const newApiKey = `sk_live_${Math.random().toString(36).substring(2, 15)}`;

  // Update Organization Metadata
  await workos.updateOrganization(organization.id, {
    metadata: {
      ...organization.metadata,
      apiKey: newApiKey,
    },
  });

  revalidatePath(`/organizations/${organizationId}`);
  if (organization) {
    const orgSlug = organization.slug || organization.id;
    revalidatePath(`/organizations/${orgSlug}`);
    revalidatePath(`/organizations/${orgSlug}/settings`);
  }
  return newApiKey;
}

export async function createOrganization(label: string, slug: string) {
  const { user } = await withAuth();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Create the organization via WorkOS
    const workos = await getWorkOS();
    const organization = await workos.createOrganization({
      name: label,
      slug,
    });

    const organizationId = organization.id;

    // 2. Provision platform resources (API key, Turso DB, deployment)
    await provisionOrganization(organizationId);

    // 3. Update local user metadata with the new activeOrganizationId
    const targetUser = await workos.getUser(user.id);

    await workos.updateUser(user.id, {
      metadata: {
        ...targetUser.metadata,
        activeOrganizationId: organizationId,
      },
    });

    revalidatePath(`/organizations/${organizationId}`);
    revalidatePath(`/organizations/${slug}`);
    revalidatePath("/");
    return { success: true, organizationId, slug };
  } catch (error) {
    console.error("Failed to create organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
export async function updateOrganization(
  organizationId: string,
  updates: { label?: string; slug?: string },
) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workos = await getWorkOS();
  const organization = await workos.getOrganization(organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  await workos.updateOrganization(organization.id, {
    name: updates.label,
    slug: updates.slug,
  });

  const resolvedOrganization = await workos.getOrganization(organization.id);
  if (resolvedOrganization) {
    const orgSlug = resolvedOrganization.slug || resolvedOrganization.id;
    revalidatePath(`/organizations/${orgSlug}/settings`);
    revalidatePath(`/organizations/${orgSlug}`);
  }

  revalidatePath(`/`);
}

export async function selectOrganizationAction(organizationId: string) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workos = await getWorkOS();
  const organization = await workos.getOrganization(organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  await workos.updateUser(user.id, {
    metadata: {
      ...user.metadata,
      activeOrganizationId: organization.id,
    },
  });

  revalidatePath("/");
  const orgSlug = organization.slug || organization.id;
  revalidatePath(`/organizations/${orgSlug}`);
}

export async function listOrganizations() {
  const { user } = await withAuth();
  if (!user) {
    return [];
  }

  try {
    const workos = await getWorkOS();
    const result = await workos.listOrganizations();
    return result.data;
  } catch (error) {
    console.error("Failed to list organizations:", error);
    return [];
  }
}

export async function executeSparqlQuery(worldId: string, query: string) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const workos = await getWorkOS();
    const activeOrgId = await getActiveOrgId(user);
    if (!activeOrgId) throw new Error("No active organization");
    const organization = await workos.getOrganization(activeOrgId);
    if (!organization) throw new Error("Organization not found");
    const sdk = getSdkForOrg(organization);

    // Resolve world to ensure we have the actual ID for sub-resource call
    const world = await sdk.worlds.get(worldId);
    if (!world) {
      throw new Error("World not found");
    }
    const results = await sdk.worlds.sparql(world.id, query);
    return { success: true, results };
  } catch (error) {
    console.error("Failed to execute SPARQL query:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute query",
    };
  }
}

export async function searchTriples(
  worldId: string,
  query: string,
  options?: { limit?: number; subjects?: string[]; predicates?: string[] },
) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const workos = await getWorkOS();
    const activeOrgId = await getActiveOrgId(user);
    if (!activeOrgId) throw new Error("No active organization");
    const organization = await workos.getOrganization(activeOrgId);
    if (!organization) throw new Error("Organization not found");
    const sdk = getSdkForOrg(organization);

    // Resolve world to ensure we have the actual ID for sub-resource call
    const world = await sdk.worlds.get(worldId);
    if (!world) {
      throw new Error("World not found");
    }
    const results = await sdk.worlds.search(world.id, query, options);
    return { success: true, results };
  } catch (error) {
    console.error("Failed to search triples:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search",
    };
  }
}

export async function listWorldLogs(
  worldId: string,
  page?: number,
  pageSize?: number,
  level?: string,
) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const workos = await getWorkOS();
    const activeOrgId = await getActiveOrgId(user);
    if (!activeOrgId) throw new Error("No active organization");
    const organization = await workos.getOrganization(activeOrgId);
    if (!organization) throw new Error("Organization not found");
    const sdk = getSdkForOrg(organization);

    // Resolve world to ensure we have the actual ID for sub-resource call
    const world = await sdk.worlds.get(worldId);
    if (!world) {
      throw new Error("World not found");
    }
    const logs = await sdk.worlds.listLogs(world.id, { page, pageSize, level });

    return { success: true, logs };
  } catch (error) {
    console.error("Failed to list world logs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list logs",
    };
  }
}

export async function pingEndpointAction(url: string): Promise<boolean> {
  const { user } = await withAuth();
  if (!user) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Attempt a HEAD request first, fallback to GET if needed, but since we simply want to know if it's there
    await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    // Any successful connection is 'alive', even if it returns a 404/500 code.
    // fetch only throws an error for network failures like connection refused.
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}
