import * as authkit from "@workos-inc/authkit-nextjs";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { sdk } from "@/lib/sdk";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await authkit.withAuth();

  if (!user) {
    notFound();
  }

  let currentUser = user;
  if (currentUser) {
    const workos = authkit.getWorkOS();
    currentUser = await workos.userManagement.getUser(currentUser.id);
  }

  if (!currentUser || !currentUser.metadata?.admin) {
    notFound();
  }

  // Check if user is a shadow user - redirect to root if plan is null/undefined or "shadow"
  try {
    const account = await sdk.organizations.get(user.id);
    if (account && (!account.plan || account.plan === "shadow")) {
      redirect("/");
    }
  } catch (error) {
    // If account fetch fails, allow through (admin check already passed)
    console.error("Failed to fetch account for shadow user check:", error);
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
        {children}
      </div>
    </>
  );
}
