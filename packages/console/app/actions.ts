"use server";

import { revalidatePath } from "next/cache";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";

async function getActiveOrgId(user: authkit.AuthUser) {
  // Always prefer metadata.organizationId if it exists
  return user.metadata?.organizationId as string | undefined;
}

export async function signOutAction() {
  await authkit.signOut();
}

export async function updateWorld(
  organizationId: string,
  worldId: string,
  updates: { label?: string; slug?: string; description?: string },
) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Resolve world to ensure we have the actual ID for mutation
  const world = await sdk.worlds.get(worldId, { organizationId });
  if (!world) {
    throw new Error("World not found");
  }

  await sdk.worlds.update(world.id, updates);

  const orgMgmt = await authkit.getOrganizationManagement();
  const [resolvedWorld, organization] = await Promise.all([
    sdk.worlds.get(world.id, { organizationId }),
    orgMgmt.getOrganization(organizationId),
  ]);

  if (resolvedWorld && organization) {
    const orgSlug = organization.metadata.slug || organization.id;
    const worldSlug = resolvedWorld.slug || resolvedWorld.id;
    revalidatePath(`/organizations/${orgSlug}`);
    revalidatePath(`/organizations/${orgSlug}/worlds/${worldSlug}`);
  }
}

export async function deleteWorld(organizationId: string, worldId: string) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Resolve world to ensure we have the actual ID for mutation
  const world = await sdk.worlds.get(worldId, { organizationId });
  if (!world) {
    throw new Error("World not found");
  }

  await sdk.worlds.delete(world.id);
  const orgMgmt = await authkit.getOrganizationManagement();
  const organization = await orgMgmt.getOrganization(organizationId);
  if (organization) {
    const orgSlug = organization.metadata.slug || organization.id;
    revalidatePath(`/organizations/${orgSlug}`);
  }
}

export async function createWorld(
  organizationId: string,
  label: string,
  slug: string,
) {
  try {
    const { user } = await authkit.withAuth();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Resolve organization via OrganizationManagement
    const orgMgmt = await authkit.getOrganizationManagement();
    const organization = await orgMgmt.getOrganization(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const actualOrgId = organization.id;
    const orgSlug = organization.metadata.slug || organization.id;

    console.log("Creating new world...", {
      organizationId: actualOrgId,
      label,
      slug,
    });
    const world = await sdk.worlds.create({
      label,
      slug,
      organizationId: actualOrgId,
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
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Cleanup all worlds in this organization (best effort)
  try {
    const worlds = await sdk.worlds.list({
      page: 1,
      pageSize: 100,
      organizationId,
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

  // 2. Cleanup all service accounts in this organization (best effort)
  try {
    const serviceAccounts = await sdk.serviceAccounts.list(organizationId, {
      page: 1,
      pageSize: 100,
    });
    for (const sa of serviceAccounts) {
      try {
        await sdk.serviceAccounts.delete(organizationId, sa.id);
      } catch (e) {
        console.error(`Failed to cleanup service account ${sa.id}:`, e);
      }
    }
  } catch (error) {
    console.warn(
      "Failed to list service accounts for cleanup (ignoring):",
      error,
    );
  }

  // 3. Remove the organization via OrganizationManagement
  const orgMgmt = await authkit.getOrganizationManagement();
  const organization = await orgMgmt.getOrganization(organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  await orgMgmt.deleteOrganization(organization.id);

  revalidatePath("/");

  // 4. If this was the active organization, clear it from metadata
  const activeOrgId = await getActiveOrgId(user);
  if (activeOrgId === organizationId) {
    const workos = await authkit.getWorkOS();
    await workos.userManagement.updateUser({
      userId: user.id,
      metadata: {
        ...(user.metadata as unknown as Record<string, string | null>),
        organizationId: "",
        testApiKey: "",
      },
    });
  }

  await authkit.signOut();
  return { success: true };
}

export async function rotateApiKey(organizationId: string) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Service accounts still go through the SDK (server-managed)
  const serviceAccounts = await sdk.serviceAccounts.list(organizationId);
  await Promise.all(
    serviceAccounts.map((sa) =>
      sdk.serviceAccounts.delete(organizationId, sa.id),
    ),
  );

  const newServiceAccount = await sdk.serviceAccounts.create(organizationId, {
    label: "Default",
  });

  const workos = await authkit.getWorkOS();

  const activeOrgId = await getActiveOrgId(user);
  if (activeOrgId === organizationId) {
    await workos.userManagement.updateUser({
      userId: user.id,
      metadata: {
        ...(user.metadata as unknown as Record<string, string | null>),
        testApiKey: newServiceAccount.apiKey || "",
      },
    });
  }

  revalidatePath(`/organizations/${organizationId}`);
  const orgMgmt = await authkit.getOrganizationManagement();
  const organization = await orgMgmt.getOrganization(organizationId);
  if (organization) {
    const orgSlug = organization.metadata.slug || organization.id;
    revalidatePath(`/organizations/${orgSlug}`);
  }
  return newServiceAccount.apiKey || "";
}

export async function createOrganization(label: string, slug: string) {
  const { user } = await authkit.withAuth();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Create the organization via OrganizationManagement
    const orgMgmt = await authkit.getOrganizationManagement();
    const organization = await orgMgmt.createOrganization({
      name: label,
      slug,
    });

    const organizationId = organization.id;

    // 2. Create a default service account and get its API key.
    const serviceAccount = await sdk.serviceAccounts.create(organizationId, {
      label: "Default",
      description: "Auto-generated for testing",
    });

    // 3. Update local user metadata with the NEW organizationId and testApiKey.
    const workos = await authkit.getWorkOS();
    const targetUser = await workos.userManagement.getUser(user.id);

    await workos.userManagement.updateUser({
      userId: user.id,
      metadata: {
        ...(targetUser.metadata as unknown as Record<string, string | null>),
        organizationId: organizationId,
        testApiKey: serviceAccount.apiKey || "",
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
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const orgMgmt = await authkit.getOrganizationManagement();
  const organization = await orgMgmt.getOrganization(organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  await orgMgmt.updateOrganization(organization.id, {
    name: updates.label,
    slug: updates.slug,
  });

  const resolvedOrganization = await orgMgmt.getOrganization(organization.id);
  if (resolvedOrganization) {
    const orgSlug =
      resolvedOrganization.metadata.slug || resolvedOrganization.id;
    revalidatePath(`/organizations/${orgSlug}/settings`);
    revalidatePath(`/organizations/${orgSlug}`);
  }

  revalidatePath(`/`);
}

export async function listOrganizations() {
  const { user } = await authkit.withAuth();
  if (!user) {
    return [];
  }

  try {
    const orgMgmt = await authkit.getOrganizationManagement();
    const organizations = await orgMgmt.listOrganizations();
    return organizations;
  } catch (error) {
    console.error("Failed to list organizations:", error);
    return [];
  }
}

export async function executeSparqlQuery(worldId: string, query: string) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
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
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
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

export async function updateServiceAccount(
  organizationId: string,
  serviceAccountId: string,
  updates: { label?: string; description?: string },
) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await sdk.serviceAccounts.update(organizationId, serviceAccountId, updates);

  const orgMgmt = await authkit.getOrganizationManagement();
  const organization = await orgMgmt.getOrganization(organizationId);
  if (organization) {
    const orgSlug = organization.metadata.slug || organization.id;
    revalidatePath(
      `/organizations/${orgSlug}/service-accounts/${serviceAccountId}`,
    );
    revalidatePath(
      `/organizations/${orgSlug}/service-accounts/${serviceAccountId}/settings`,
    );
  }
}

export async function rotateServiceAccountKey(
  organizationId: string,
  serviceAccountId: string,
) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const result = await sdk.serviceAccounts.rotateKey(
    organizationId,
    serviceAccountId,
  );

  const orgMgmt = await authkit.getOrganizationManagement();
  const organization = await orgMgmt.getOrganization(organizationId);
  if (organization) {
    const orgSlug = organization.metadata.slug || organization.id;
    revalidatePath(`/organizations/${orgSlug}/service-accounts`);
    revalidatePath(
      `/organizations/${orgSlug}/service-accounts/${serviceAccountId}`,
    );
    revalidatePath(
      `/organizations/${orgSlug}/service-accounts/${serviceAccountId}/settings`,
    );
  }

  return result;
}

export async function deleteServiceAccount(
  organizationId: string,
  serviceAccountId: string,
) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await sdk.serviceAccounts.delete(organizationId, serviceAccountId);
  const orgMgmt = await authkit.getOrganizationManagement();
  const organization = await orgMgmt.getOrganization(organizationId);
  if (organization) {
    const orgSlug = organization.metadata.slug || organization.id;
    revalidatePath(`/organizations/${orgSlug}/service-accounts`);
  }
}

export async function listWorldLogs(
  worldId: string,
  page?: number,
  pageSize?: number,
  level?: string,
) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
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
