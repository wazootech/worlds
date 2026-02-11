"use server";

import { revalidatePath } from "next/cache";
import * as authkit from "@workos-inc/authkit-nextjs";
import { sdk } from "@/lib/sdk";

export async function updateWorld(
  worldId: string,
  updates: { label?: string; description?: string },
) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await sdk.worlds.update(worldId, updates, { accountId: user.id });
  revalidatePath(`/worlds/${worldId}`);
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function updateWorldName(worldId: string, label: string) {
  await updateWorld(worldId, { label });
}

export async function updateWorldDescription(
  worldId: string,
  description: string,
) {
  await updateWorld(worldId, { description });
}

export async function deleteWorld(worldId: string) {
  const { user } = await authkit.withAuth();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await sdk.worlds.delete(worldId, { accountId: user.id });
  revalidatePath("/");
}
