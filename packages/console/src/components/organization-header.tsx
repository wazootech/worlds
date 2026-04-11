"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { Globe, Settings, LayoutGrid } from "lucide-react";
import { useOrganization } from "@/components/organization-context";
import { PageHeader } from "@/components/page-header";

export function OrganizationHeader() {
  const { organization, user, isAdmin } = useOrganization();
  const segment = useSelectedLayoutSegment();
  if (!organization.slug) throw new Error("Organization is missing a slug");

  // Organization layout is a parent of World layout.
  // If the segment is not null (org home) or '~' (org settings), we are in a world sub-route.
  if (segment !== null && segment !== "~") {
    return null;
  }

  const isSettings = segment === "~";
  const currentLabel = isSettings ? "Settings" : "Worlds";
  const currentIcon = isSettings ? (
    <Settings className="w-3 h-3 text-stone-500" />
  ) : (
    <LayoutGrid className="w-3 h-3 text-stone-500" />
  );

  const menuItems = [
    {
      label: "Worlds",
      href: `/${organization.slug}`,
      icon: <Globe className="w-4 h-4" />,
    },
    {
      label: "Settings",
      href: `/${organization.slug}/~/settings`,
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <PageHeader
      user={user}
      isAdmin={isAdmin}
      resource={{
        label: currentLabel,
        href: isSettings
          ? `/${organization.slug}/~/settings`
          : `/${organization.slug}`,
        icon: currentIcon,
        menuItems: menuItems,
      }}
      tabs={[
        { label: "Worlds", href: `/${organization.slug}` },
        { label: "Settings", href: `/${organization.slug}/~/settings` },
      ]}
    />
  );
}
