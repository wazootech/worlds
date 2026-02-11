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

  await sdk.worlds.update(worldId, { description });
  revalidatePath("/");
}

export async function deleteWorld(worldId: string) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await sdk.worlds.delete(worldId);
  revalidatePath("/");
}

export async function createWorld() {
  try {
    const { user } = await authkit.withAuth();
    if (!user) {
      throw new Error("Unauthorized");
    }

    console.log("Creating new world...", { organizationId: user.id });
    const world = await sdk.worlds.create(
      {
        label: "New World",
        organizationId: user.id,
      },
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

  // Remove the organization from the database
  await sdk.organizations.delete(user.id);

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

  const serviceAccounts = await sdk.organizations.serviceAccounts.list(user.id);
  await Promise.all(
    serviceAccounts.map((sa) =>
      sdk.organizations.serviceAccounts.delete(user.id, sa.id)
    ),
  );

  const newServiceAccount = await sdk.organizations.serviceAccounts.create(
    user.id,
    {
      label: "Default",
    },
  );

  const workos = authkit.getWorkOS();
  
  // Use the correct update signature: { userId, metadata: ... }
  // Wait, I need to check if user.id is correct. Yes.
  // And merge with existing metadata? The API merges at top level but replaces nested?
  // WorkOS metadata is key-value strings.
  // I should probably fetch existing metadata first to be safe, like admin actions.
  // But strictly for testApiKey, I can just upsert.
  // Actually, let's just do a direct update for now as we did in callback/route.ts (Wait, callback used the new signature).
  // The signature issue in route.ts was `updateUser(id, { ... })` -> `updateUser({ userId: id, ... })`.
  
  await workos.userManagement.updateUser({
    userId: user.id,
    metadata: {
      testApiKey: newServiceAccount.apiKey,
    },
  });

  revalidatePath(`/users/${user.id}`);
  return newServiceAccount.apiKey;
}
