import * as authkit from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { WorldSearch } from "../world-search";

import type { Metadata } from "next";
import { sdk } from "@/lib/sdk";

type Params = { worldId: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { worldId } = await props.params;
  const { user } = await authkit.withAuth();

  if (!user) {
    return { title: "Search" };
  }

  try {
    const world = await sdk.worlds.get(worldId, { accountId: user.id });
    return {
      title: world ? `Search - ${world.label}` : "Search",
    };
  } catch {
    return { title: "Search" };
  }
}

export default async function WorldSearchPage(props: {
  params: Promise<Params>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { worldId } = await props.params;
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  return <WorldSearch worldId={worldId} userId={user.id} />;
}
