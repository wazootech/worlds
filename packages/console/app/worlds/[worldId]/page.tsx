import * as authkit from "@workos-inc/authkit-nextjs";
import { codeToHtml } from "shiki";
import { notFound, redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import { WorldDetails } from "./world-details";
import type { Metadata } from "next";

type Params = { worldId: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { worldId } = await props.params;
  const { user } = await authkit.withAuth();

  if (!user) {
    return {
      title: "World Details",
    };
  }

  try {
    const world = await sdk.worlds.get(worldId, { accountId: user.id });
    if (!world) {
      return {
        title: "World Details",
      };
    }
    return {
      title: world.label || "World Details",
    };
  } catch {
    return {
      title: "World Details",
    };
  }
}

export default async function WorldOverviewPage(props: {
  params: Promise<Params>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { worldId } = await props.params;

  // Check authentication
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  // Get full user object to check admin status
  let currentUser = user;
  if (currentUser) {
    const workos = authkit.getWorkOS();
    currentUser = await workos.userManagement.getUser(currentUser.id);
  }

  const isAdmin = !!currentUser?.metadata?.admin;

  // Fetch account
  let account;
  try {
    account = await sdk.accounts.get(user.id);
  } catch (error) {
    console.error("Failed to fetch account:", error);
    return null; // Layout will handle error state or not found
  }

  if (!account) {
    return null;
  }

  // Fetch world data
  let world;
  try {
    world = await sdk.worlds.get(worldId, { accountId: user.id });
  } catch (error) {
    console.error("Failed to fetch world:", error);
    return null;
  }

  if (!world) {
    notFound();
  }

  // Generate code snippets
  const codeSnippet = `import { WorldsSdk } from "@fartlabs/worlds";

const sdk = new WorldsSdk({
  apiKey: "${account.apiKey}",
});

const world = await sdk.worlds.get("${worldId}");
console.log("Connected to world:", world.label);`;

  const maskedCodeSnippet = `import { WorldsSdk } from "@fartlabs/worlds";

const sdk = new WorldsSdk({
  apiKey: "${account.apiKey.slice(0, 4)}...${account.apiKey.slice(-4)}",
});

const world = await sdk.worlds.get("${worldId}");
console.log("Connected to world:", world.label);`;

  const codeSnippetHtml = await codeToHtml(codeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  const maskedCodeSnippetHtml = await codeToHtml(maskedCodeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  return (
    <WorldDetails
      world={world}
      userId={user.id}
      apiKey={account.apiKey}
      codeSnippet={codeSnippet}
      maskedCodeSnippet={maskedCodeSnippet}
      codeSnippetHtml={codeSnippetHtml}
      maskedCodeSnippetHtml={maskedCodeSnippetHtml}
      isAdmin={isAdmin}
    />
  );
}
