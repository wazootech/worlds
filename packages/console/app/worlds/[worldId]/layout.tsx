import * as authkit from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import { WorldTabsNav } from "./world-tabs-nav";
import React from "react";

type Params = { worldId: string };

export default async function WorldLayout(props: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { worldId } = await props.params;

  // Check authentication
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  if (!user.id) {
    return (
      <ErrorState
        title="Account Not Found"
        message="Your WorkOS user is not associated with a Worlds API account."
      />
    );
  }

  // Fetch account
  let account;
  try {
    account = await sdk.organizations.get(user.id);
  } catch (error) {
    console.error("Failed to fetch account:", error);
    return (
      <ErrorState
        title="Error"
        message="Failed to load account data. Please try again later."
        titleClassName="text-red-600"
      />
    );
  }

  if (!account) {
    return (
      <ErrorState
        title="Account Not Found"
        message="Your WorkOS user is not associated with a Worlds API account."
      />
    );
  }

  // Check if user is a shadow user - redirect to root if plan is null/undefined or "shadow"
  if (!account.plan || account.plan === "shadow") {
    redirect("/");
  }

  // Fetch world data
  let world;
  try {
    world = await sdk.worlds.get(worldId);
  } catch (error) {
    console.error("Failed to fetch world:", error);
    return (
      <ErrorState
        title="Error"
        message="Failed to load world data. Please try again later."
        titleClassName="text-red-600"
      />
    );
  }

  if (!world) {
    notFound();
  }

  // Verify ownership
  if (world.organizationId !== user.id) {
    return (
      <ErrorState
        title="Forbidden"
        message="You do not have permission to view this world."
        titleClassName="text-red-600"
      />
    );
  }

  return (
    <>
      <div className="w-full mx-auto max-w-5xl px-6 pb-12">
        <div className="space-y-6">
          <WorldTabsNav worldId={worldId} />
          <div className="min-h-[400px]">{props.children}</div>
        </div>
      </div>
    </>
  );
}

function ErrorState({
  title,
  message,
  titleClassName = "text-stone-900 dark:text-stone-50",
}: {
  title: string;
  message: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-stone-50 dark:bg-stone-950 font-sans">
      <div className="text-center">
        <h1 className={`text-2xl font-bold mb-4 ${titleClassName}`}>{title}</h1>
        <p className="text-stone-600 dark:text-stone-400">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-block text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
