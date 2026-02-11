"use server";

import { sdk } from "@/lib/sdk";
import { revalidatePath } from "next/cache";
import * as authkit from "@workos-inc/authkit-nextjs";

import { customAlphabet } from "nanoid";

export async function createInviteAction() {
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
      error: "Forbidden: Only admins can create invites",
    };
  }

  let attempts = 0;
  while (attempts < 3) {
    try {
      const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4);
      await sdk.invites.create({ code: nanoid() });
      revalidatePath("/invites");
      return { success: true };
    } catch (error) {
      console.error(`Attempt ${attempts + 1} failed:`, error);
      attempts++;
    }
  }
  return {
    success: false,
    error: "Failed to create unique invite code after multiple attempts",
  };
}

export async function deleteInviteAction(id: string) {
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
      error: "Forbidden: Only admins can delete invites",
    };
  }

  try {
    await sdk.invites.delete(id);
    revalidatePath("/invites");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete invite:", error);
    return { success: false, error: "Failed to delete invite" };
  }
}
export async function deleteInvitesAction(ids: string[]) {
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
      error: "Forbidden: Only admins can delete invites",
    };
  }

  const results = await Promise.allSettled(
    ids.map((id) => sdk.invites.delete(id)),
  );
  revalidatePath("/invites");

  if (results.some((r) => r.status === "rejected")) {
    return { success: false, error: "Failed to delete some invites" };
  }

  return { success: true };
}
