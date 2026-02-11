import * as authkit from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { WorldPlayground } from "../world-playground";

import type { Metadata } from "next";
import { sdk } from "@/lib/sdk";

type Params = { worldId: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { worldId } = await props.params;
  const { user } = await authkit.withAuth();

  if (!user) {
    return { title: "Playground" };
  }

  try {
    const world = await sdk.worlds.get(worldId);
    return {
      title: world ? `Playground - ${world.label}` : "Playground",
    };
  } catch {
    return { title: "Playground" };
  }
}

export default async function WorldPlaygroundPage(props: {
  params: Promise<Params>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { worldId } = await props.params;
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  return <WorldPlayground worldId={worldId} userId={user.id} />;
}
