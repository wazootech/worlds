import * as authkit from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ShieldCheck, LayoutGrid, BarChart3, Settings } from "lucide-react";
import { ServiceAccountDetails } from "@/components/service-account-details";

type Params = { organizationId: string; serviceAccountId: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organizationId, serviceAccountId } = await props.params;

  try {
    const [sa, organization] = await Promise.all([
      sdk.organizations.serviceAccounts.get(organizationId, serviceAccountId),
      sdk.organizations.get(organizationId),
    ]);

    if (!sa || !organization) {
      return { title: "Service Account Details" };
    }

    return {
      title: `${sa.label || sa.id} | Service Accounts`,
    };
  } catch {
    return {
      title: "Service Account Details",
    };
  }
}

export default async function ServiceAccountDetailsPage(props: {
  params: Promise<Params>;
}) {
  const { organizationId, serviceAccountId } = await props.params;

  // Check authentication
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  const isAdmin = !!user?.metadata?.admin;

  // Fetch data
  const [organization, sa] = await Promise.all([
    sdk.organizations.get(organizationId).catch(() => null),
    sdk.organizations.serviceAccounts
      .get(organizationId, serviceAccountId)
      .catch(() => null),
  ]);

  if (!organization || !sa) {
    notFound();
  }

  const resourceMenuItems = [
    {
      label: "Worlds",
      href: `/organizations/${organizationId}`,
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      label: "Service Accounts",
      href: `/organizations/${organizationId}/service-accounts`,
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      label: "Metrics",
      href: `/organizations/${organizationId}/metrics`,
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      label: "Settings",
      href: `/organizations/${organizationId}/settings`,
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const breadcrumbs = [
    {
      label: "Service Accounts",
      href: `/organizations/${organizationId}/service-accounts`,
      icon: <ShieldCheck className="w-3 h-3 text-stone-500" />,
      menuItems: resourceMenuItems,
    },
    {
      label: sa.label || sa.id,
      href: `/organizations/${organizationId}/service-accounts/${serviceAccountId}`,
      icon: <ShieldCheck className="w-3 h-3 text-stone-500" />,
    },
  ];

  const tabs = [
    {
      label: "Overview",
      href: `/organizations/${organizationId}/service-accounts/${serviceAccountId}`,
    },
    {
      label: "Settings",
      href: `/organizations/${organizationId}/service-accounts/${serviceAccountId}/settings`,
    },
  ];

  return (
    <>
      <PageHeader
        user={user}
        isAdmin={isAdmin}
        resource={breadcrumbs}
        tabs={tabs}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <ServiceAccountDetails
          serviceAccount={sa}
          organizationId={organizationId}
        />
      </main>
    </>
  );
}
