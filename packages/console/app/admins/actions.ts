"use server";

import * as authkit from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";

export async function toggleAdminAction(userId: string, isAdmin: boolean) {
  // Verify the current user is an admin
  const { user } = await authkit.withAuth();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const workos = authkit.getWorkOS();
  const currentUser = await workos.userManagement.getUser(user.id);

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
    const targetUser = await workos.userManagement.getUser(userId);

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

    await workos.userManagement.updateUser({
      userId,
      metadata: updatedMetadata,
    });

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Failed to update admin status:", error);
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "Failed to update admin status",
    };
  }
}

export async function deleteOrganizationAction(userId: string) {
  // Verify the current user is an admin
  const { user } = await authkit.withAuth();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const workos = authkit.getWorkOS();
  const currentUser = await workos.userManagement.getUser(user.id);

  if (!currentUser || !currentUser.metadata?.admin) {
    return {
      success: false,
      error: "Forbidden: Only admins can delete organizations",
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
    const { sdk } = await import("@/lib/sdk");

    // 1. Delete from Worlds API
    try {
      await sdk.organizations.delete(userId);
    } catch (error) {
      console.error(
        `Failed to delete account ${userId} from Worlds API:`,
        error,
      );
      // We continue even if Worlds API delete fails, as the account might not exist there
      // or we want to ensure WorkOS user is deleted anyway.
    }

    // 2. Delete from WorkOS
    await workos.userManagement.deleteUser(userId);

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete organization",
    };
  }
}
