import * as authkit from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { sdk } from "@/lib/sdk";
import { PageHeader } from "@/components/page-header";

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
    const workos = await authkit.getWorkOS();
    currentUser = await workos.userManagement.getUser(currentUser.id);
  }

  if (!currentUser || !currentUser.metadata?.admin) {
    notFound();
  }

  const isAdmin = true;

  return (
    <>
      <PageHeader user={user} isAdmin={isAdmin} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
        {children}
      </div>
    </>
  );
}
