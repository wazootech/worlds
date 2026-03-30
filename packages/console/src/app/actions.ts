"use server";

import { revalidatePath } from "next/cache";
import type { WorkOSUser } from "@/lib/auth";
import { withAuth, signOut } from "@/lib/auth";
import {
  getWorkOS,
  provisionOrganization,
  teardownOrganization,
} from "@/lib/platform";
import { getWorldsByOrgMetadata } from "@/lib/worlds";

function getActiveOrgId(user: WorkOSUser) {
  return user.metadata?.activeOrganizationId as string | undefined;
}

/**
 * signOutAction signs out the current user session.
 */
export async function signOutAction() {
  await signOut();
}

/**
 * updateWorld updates a world's metadata (label, slug, description).
 */
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
  const worlds = getWorldsByOrgMetadata(organization);

  // Resolve world to ensure we have the actual ID for mutation
  const world = await worlds.get(worldId);
  if (!world) {
    throw new Error("World not found");
  }

  await worlds.update(world.id, updates);

  if (organization) {
    const finalWorldSlug = updates.slug ?? world.slug;
    if (!organization.slug || !finalWorldSlug) {
      throw new Error("Organization or World is missing a slug");
    }

    revalidatePath(`/${organization.slug}`);
    revalidatePath(`/${organization.slug}/${finalWorldSlug}`);
  }
}

/**
 * deleteWorld deletes a world from an organization.
 */
export async function deleteWorld(organizationId: string, worldId: string) {
  const { user } = await withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workos = await getWorkOS();
  const organization = await workos.getOrganization(organizationId);
  if (!organization) throw new Error("Organization not found");
  const worlds = getWorldsByOrgMetadata(organization);

  // Resolve world to ensure we have the actual ID for mutation
  const world = await worlds.get(worldId);
  if (!world) {
    throw new Error("World not found");
  }

  await worlds.delete(world.id);
  // Re-fetch organization to ensure we have the slug (since we might have just used ID above? No, we have the object)
  if (organization) {
    if (!organization.slug) throw new Error("Organization is missing a slug");
    revalidatePath(`/${organization.slug}`);
  }
}

/**
 * createWorld creates a new world within an organization.
 */
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
      const ADMIN_KEY = process.env.WORLDS_API_KEY;
      if (!ADMIN_KEY) {
        throw new Error(
          "Organization has no API config and no Admin Key available to provision one.",
        );
      }
      // Default URL
      const DEFAULT_URL =
        process.env.DEFAULT_API_URL || "http://localhost:8000";

      const { Worlds } = await import("@wazoo/worlds-sdk");
      new Worlds({
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

    const worlds = getWorldsByOrgMetadata(organization);

    const actualOrgId = organization.id;
    if (!organization.slug) throw new Error("Organization is missing a slug");

    console.log("Creating new world...", {
      organizationId: actualOrgId,
      label,
      slug,
    });
    const world = await worlds.create({
      label,
      slug,
    });

    console.log("World created successfully:", world.id);

    // Artificial delay to allow for eventual consistency in DB
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath(`/${organization.id}`);
    revalidatePath(`/${organization.slug}`);

    return { success: true, worldId: world.id, slug: world.slug };
  } catch (error) {
    console.error("Failed to create world:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * deleteOrganization deletes an entire organization and all its resources.
 */
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

  const worlds = getWorldsByOrgMetadata(organization);

  // 1. Cleanup all worlds in this organization (best effort)
  try {
    const worldsList = await worlds.list({
      page: 1,
      pageSize: 100,
    });
    for (const world of worldsList) {
      try {
        await worlds.delete(world.id);
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

/**
 * rotateApiKey rotates the API key for an organization.
 */
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

  revalidatePath(`/${organizationId}`);
  if (organization) {
    if (!organization.slug) throw new Error("Organization is missing a slug");
    revalidatePath(`/${organization.slug}`);
    revalidatePath(`/${organization.slug}/~/settings`);
  }
  return newApiKey;
}

/**
 * createOrganization creates a new organization and provisions its platform resources.
 */
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

    revalidatePath(`/${organizationId}`);
    revalidatePath(`/${slug}`);
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
/**
 * updateOrganization updates an organization's name or slug.
 */
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
    if (!resolvedOrganization.slug)
      throw new Error("Organization is missing a slug");
    revalidatePath(`/${resolvedOrganization.slug}/~/settings`);
    revalidatePath(`/${resolvedOrganization.slug}`);
  }

  revalidatePath(`/`);
}

/**
 * selectOrganizationAction sets the active organization for the current user.
 */
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
  if (!organization.slug) throw new Error("Organization is missing a slug");
  revalidatePath(`/${organization.slug}`);
}

/**
 * listOrganizations lists all organizations for the current user.
 */
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

/**
 * executeSparqlQuery executes a SPARQL query against a world.
 */
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
    const worlds = getWorldsByOrgMetadata(organization);

    // Resolve world to ensure we have the actual ID for sub-resource call
    const world = await worlds.get(worldId);
    if (!world) {
      throw new Error("World not found");
    }
    const results = await worlds.sparql(world.id, query);
    return { success: true, results };
  } catch (error) {
    console.error("Failed to execute SPARQL query:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute query",
    };
  }
}

/**
 * searchTriples searches for triples in a world using a keyword or filters.
 */
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
    const worlds = getWorldsByOrgMetadata(organization);

    // Resolve world to ensure we have the actual ID for sub-resource call
    const world = await worlds.get(worldId);
    if (!world) {
      throw new Error("World not found");
    }
    const results = await worlds.search(world.id, query, options);
    return { success: true, results };
  } catch (error) {
    console.error("Failed to search triples:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search",
    };
  }
}

/**
 * listWorldLogs lists logs for a world with pagination and level filtering.
 */
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
    const worlds = getWorldsByOrgMetadata(organization);

    // Resolve world to ensure we have the actual ID for sub-resource call
    const world = await worlds.get(worldId);
    if (!world) {
      throw new Error("World not found");
    }
    const logs = await worlds.listLogs(world.id, { page, pageSize, level });

    return { success: true, logs };
  } catch (error) {
    console.error("Failed to list world logs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list logs",
    };
  }
}

/**
 * pingEndpointAction pings an endpoint to check if it is alive.
 */
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
