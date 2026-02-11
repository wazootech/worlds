"use server";

import { revalidatePath } from "next/cache";
import * as authkit from "@workos-inc/authkit-nextjs";
import { sdk } from "@/lib/sdk";

export async function signOutAction() {
  await authkit.signOut();
}

export async function updateWorldDescription(
  worldId: string,
  description: string,
) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await sdk.worlds.update(worldId, { description }, { accountId: user.id });
  revalidatePath("/");
}

export async function deleteWorld(worldId: string) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await sdk.worlds.delete(worldId, { accountId: user.id });
  revalidatePath("/");
}

export async function createWorld() {
  try {
    const { user } = await authkit.withAuth();
    if (!user) {
      throw new Error("Unauthorized");
    }

    console.log("Creating new world...", { accountId: user.id });
    const world = await sdk.worlds.create(
      {
        label: "New World",
        isPublic: false,
      },
      { accountId: user.id },
    );

    console.log("World created successfully:", world.id);

    // Artificial delay to allow for eventual consistency in DB
    await new Promise((resolve) => setTimeout(resolve, 1000));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to create world:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteAccount() {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Remove the account from the database
  await sdk.accounts.delete(user.id);

  // Sign out the user
  await authkit.signOut();
}

export async function redeemInviteAction(code: string) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    await sdk.invites.redeem(code, user.id);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to redeem invite:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to redeem invite",
    };
  }
}

export async function rotateApiKey() {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await sdk.accounts.rotate(user.id);
  revalidatePath(`/accounts/${user.id}`);
}
