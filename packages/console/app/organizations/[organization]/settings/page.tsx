import { PageHeader } from "@/components/page-header";
import { LayoutGrid, ShieldCheck, BarChart3, Settings } from "lucide-react";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BasicDetailsForm } from "@/components/basic-details-form";
import { DeleteOrganizationSection } from "@/components/delete-organization-section";

type Params = { organization: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationId } = await props.params;
  try {
    const organization = await sdk.organizations.get(organizationId);
    return {
      title: `Settings | ${organization?.label || "Organization"}`,
    };
  } catch {
    return {
      title: "Settings",
    };
  }
}

export default async function SettingsPage(props: { params: Promise<Params> }) {
  const { organization: organizationId } = await props.params;
  const { user } = await authkit.withAuth();

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

  const orgSlug = organization.slug || organization.id;

  // Canonical redirect to slug if ID was used in the URL
  if (
    organizationId === organization.id &&
    organization.slug &&
    organization.slug !== organization.id
  ) {
    redirect(`/organizations/${organization.slug}/settings`);
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
          label: "Settings",
          href: `/organizations/${orgSlug}/settings`,
          icon: <Settings className="w-3 h-3 text-stone-500" />,
          menuItems: resourceMenuItems,
        }}
        tabs={tabs}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
            Organization Settings
          </h1>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white mb-4">
                Basic Details
              </h2>
              <BasicDetailsForm
                initialLabel={organization.label}
                initialSlug={organization.slug}
              />
            </div>
            <div className="bg-stone-50 dark:bg-stone-950/50 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Organization ID:{" "}
                <code className="font-mono">{organization.id}</code>
              </p>
            </div>
          </div>

          <DeleteOrganizationSection userEmail={user.email} />
        </div>
      </main>
    </>
  );
}
