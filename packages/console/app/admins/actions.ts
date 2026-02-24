"use server";

import { withAuth } from "@/lib/auth";
import { getWorkOS, teardownOrganization } from "@/lib/platform";
import { revalidatePath } from "next/cache";

export async function toggleAdminAction(userId: string, isAdmin: boolean) {
  // Verify the current user is an admin
  const { user } = await withAuth();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const workos = await getWorkOS();
  const currentUser = await workos.getUser(user.id);

  if (!currentUser || !currentUser.metadata?.admin) {
    return {
      success: false,
      error: "Forbidden: Only admins can modify admin status",
    };
  }

  // Prevent admins from modifying their own admin status
  if (userId === user.id) {
    return {
      success: false,
      error: "You cannot modify your own admin status",
    };
  }

  try {
    // Get the user first to preserve existing metadata
    const targetUser = await workos.getUser(userId);

    // Update the user's metadata, preserving existing metadata
    // WorkOS updateUser takes a single object parameter
    const existingMetadata = targetUser.metadata || {};

    // Create updated metadata object, preserving all existing fields
    const updatedMetadata: Record<string, string> = {};

    // Convert all existing metadata values to strings (WorkOS requires string values)
    for (const [key, value] of Object.entries(existingMetadata)) {
      if (key !== "admin") {
        updatedMetadata[key] = String(value);
      }
    }

    // Set admin status: store "true" as string when admin, remove key when not admin
    // This way !!metadata.admin works correctly (truthy string = true, undefined = false)
    if (isAdmin) {
      updatedMetadata.admin = "true";
    }
    // If setting to false, we don't include the admin key, effectively removing it

    await workos.updateUser(userId, {
      metadata: updatedMetadata,
    });

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Failed to update admin status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update admin status",
    };
  }
}

export async function deleteUserAction(userId: string) {
  // Verify the current user is an admin
  const { user } = await withAuth();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const workos = await getWorkOS();
  const currentUser = await workos.getUser(user.id);

  if (!currentUser || !currentUser.metadata?.admin) {
    return {
      success: false,
      error: "Forbidden: Only admins can delete users",
    };
  }

  // Prevent admins from deleting themselves
  if (userId === user.id) {
    return {
      success: false,
      error: "You cannot delete your own account",
    };
  }

  try {
    // Get the target user to find their associated organization
    const targetUser = await workos.getUser(userId);
    const organizationId = targetUser.metadata?.activeOrganizationId as
      | string
      | undefined;

    // 1. Tear down platform resources (deployment, Turso DB)
    if (organizationId) {
      try {
        await teardownOrganization(organizationId);
      } catch (error) {
        console.error(
          `Failed to stop World API for org ${organizationId}:`,
          error,
        );
      }
    }

    // 2. Delete associated organization if it exists
    if (organizationId) {
      try {
        const workos = await getWorkOS();
        await workos.deleteOrganization(organizationId);
      } catch (error) {
        console.error(
          `Failed to delete organization ${organizationId} for user ${userId}:`,
          error,
        );
        // We continue even if org delete fails
      }
    }

    // 2. Delete from WorkOS
    await workos.deleteUser(userId);

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}
