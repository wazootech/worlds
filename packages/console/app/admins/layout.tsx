import { withAuth } from "@/lib/auth";
import { getWorkOS } from "@/lib/platform";
import { notFound } from "next/navigation";
import React from "react";

import { PageHeader } from "@/components/page-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await withAuth();

  if (!user) {
    notFound();
  }

  let currentUser = user;
  if (currentUser) {
    const workos = await getWorkOS();
    currentUser = await workos.getUser(currentUser.id);
  }

  if (!currentUser || !currentUser.metadata?.admin) {
    notFound();
  }

  const isAdmin = true;

  const tabs = [
    { label: "Users", href: "/admins" },
    { label: "Organizations", href: "/admins/organizations" },
  ];

  return (
    <>
      <PageHeader user={user} isAdmin={isAdmin} tabs={tabs} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
        {children}
      </div>
    </>
  );
}
