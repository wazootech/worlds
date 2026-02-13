import * as authkit from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import { WorldSettings } from "../world-settings";

import type { Metadata } from "next";

type Params = { worldId: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { worldId } = await props.params;
  const { user } = await authkit.withAuth();

  if (!user) {
    return { title: "Settings" };
  }

  try {
    const world = await sdk.worlds.get(worldId);
    return {
      title: world ? `Settings - ${world.label}` : "Settings",
    };
  } catch {
    return { title: "Settings" };
  }
}

export default async function WorldSettingsPage(props: {
  params: Promise<Params>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { worldId } = await props.params;
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  // Fetch world data for settings
  let world;
  try {
    world = await sdk.worlds.get(worldId);
  } catch (error) {
    console.error("Failed to fetch world:", error);
    return null;
  }

  if (!world) {
    notFound();
  }

  return <WorldSettings world={world} />;
}
