import { PageHeader } from "@/components/page-header";
import { LayoutGrid, ShieldCheck, BarChart3, Settings } from "lucide-react";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
import type { ServiceAccount } from "@wazoo/sdk";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ServiceAccountList } from "@/components/service-account-list";

type Params = { organization: string };
type SearchParams = { page?: string; pageSize?: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationId } = await props.params;
  try {
    const organization = await sdk.organizations.get(organizationId);
    return {
      title: `Service Accounts | ${organization?.label || "Organization"}`,
    };
  } catch {
    return {
      title: "Service Accounts",
    };
  }
}

export default async function ServiceAccountsPage(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { organization: organizationId } = await props.params;
  const searchParams = await props.searchParams;
  const { user } = await authkit.withAuth();

  const page = parseInt(searchParams.page || "1");
  const pageSize = parseInt(searchParams.pageSize || "20");

  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  const isAdmin = !!user?.metadata?.admin;

  let organization;
  try {
    organization = await sdk.organizations.get(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return notFound();
  }

  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;
  const orgSlug = organization.slug || organization.id;

  // Canonical redirect to slug if ID was used in the URL
  if (
    organizationId === organization.id &&
    organization.slug &&
    organization.slug !== organization.id
  ) {
    redirect(`/organizations/${organization.slug}/service-accounts`);
  }

  let serviceAccounts: ServiceAccount[] = [];
  try {
    serviceAccounts = await sdk.organizations.serviceAccounts.list(
      actualOrgId,
      page,
      pageSize,
    );
  } catch (error) {
    console.error("Failed to list service accounts:", error);
  }

  const tabs = [
    { label: "Worlds", href: `/organizations/${orgSlug}` },
    {
      label: "Service Accounts",
      href: `/organizations/${orgSlug}/service-accounts`,
    },
    { label: "Metrics", href: `/organizations/${orgSlug}/metrics` },
    { label: "Settings", href: `/organizations/${orgSlug}/settings` },
  ];

  const resourceMenuItems = [
    {
      label: "Worlds",
      href: `/organizations/${orgSlug}`,
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      label: "Service Accounts",
      href: `/organizations/${orgSlug}/service-accounts`,
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      label: "Metrics",
      href: `/organizations/${orgSlug}/metrics`,
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      label: "Settings",
      href: `/organizations/${orgSlug}/settings`,
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      <PageHeader
        user={user}
        isAdmin={isAdmin}
        resource={{
          label: "Service Accounts",
          href: `/organizations/${orgSlug}/service-accounts`,
          icon: <ShieldCheck className="w-3 h-3 text-stone-500" />,
          menuItems: resourceMenuItems,
        }}
        tabs={tabs}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
            Service Accounts
            <span className="inline-flex items-center rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:text-stone-100">
              {serviceAccounts.length >= pageSize
                ? `${serviceAccounts.length}+`
                : serviceAccounts.length}
            </span>
          </h1>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            Create Service Account
          </button>
        </div>

        <ServiceAccountList
          initialData={serviceAccounts}
          initialPage={page}
          initialPageSize={pageSize}
        />
      </main>
    </>
  );
}
