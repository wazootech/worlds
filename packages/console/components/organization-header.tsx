"use client";

import { useSelectedLayoutSegment, usePathname } from "next/navigation";
import { Globe, Settings, ShieldCheck, LayoutGrid } from "lucide-react";
import { useOrganization } from "@/components/organization-context";
import { PageHeader } from "@/components/page-header";

export function OrganizationHeader() {
  const { organization, user, isAdmin } = useOrganization();
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment();
  const orgSlug = organization.metadata.slug || organization.id;

  // Check if we are on a world-specific page
  // Pattern: /organizations/[org]/worlds/[world]...
  const isWorldPage = pathname?.includes(`/organizations/${orgSlug}/worlds/`);

  if (isWorldPage) {
    return null;
  }

  // Determine current section for the dropdown label
  let currentLabel = "Worlds";
  let currentIcon = <LayoutGrid className="w-3 h-3 text-stone-500" />;

  if (segment === "service-accounts") {
    currentLabel = "Service Accounts";
    currentIcon = <ShieldCheck className="w-3 h-3 text-stone-500" />;
  } else if (segment === "settings") {
    currentLabel = "Settings";
    currentIcon = <Settings className="w-3 h-3 text-stone-500" />;
  } else {
    // Default to Worlds (Overview)
    currentIcon = <LayoutGrid className="w-3 h-3 text-stone-500" />;
  }

  const menuItems = [
    {
      label: "Worlds",
      href: `/organizations/${orgSlug}`,
      icon: <Globe className="w-4 h-4" />,
    },
    {
      label: "Service Accounts",
      href: `/organizations/${orgSlug}/service-accounts`,
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      label: "Settings",
      href: `/organizations/${orgSlug}/settings`,
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <PageHeader
      user={user}
      isAdmin={isAdmin}
      resource={{
        label: currentLabel,
        href: `/organizations/${orgSlug}/${segment || ""}`,
        icon: currentIcon,
        menuItems: menuItems,
      }}
      tabs={[
        { label: "Worlds", href: `/organizations/${orgSlug}` },
        {
          label: "Service Accounts",
          href: `/organizations/${orgSlug}/service-accounts`,
        },
        { label: "Settings", href: `/organizations/${orgSlug}/settings` },
      ]}
    />
  );
}
