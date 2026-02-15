import { PageHeader } from "@/components/page-header";
import { LayoutGrid, ShieldCheck, BarChart3, Settings } from "lucide-react";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ComingSoonPlaceholder } from "@/components/coming-soon-placeholder";

type Params = { organization: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationId } = await props.params;
  try {
    const organization = await sdk.organizations.get(organizationId);
    return {
      title: `Metrics | ${organization?.label || "Organization"}`,
    };
  } catch {
    return {
      title: "Metrics",
    };
  }
}

export default async function MetricsPage(props: {
  params: Promise<Params>;
}) {
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

  const orgSlug = (organization as any).slug || organization.id;

  const tabs = [
    { label: "Worlds", href: `/organizations/${orgSlug}` },
    { label: "Service Accounts", href: `/organizations/${orgSlug}/service-accounts` },
    { label: "Metrics", href: `/organizations/${orgSlug}/metrics` },
    { label: "Settings", href: `/organizations/${orgSlug}/settings` },
  ];

  const resourceMenuItems = [
    { label: "Worlds", href: `/organizations/${orgSlug}`, icon: <LayoutGrid className="w-4 h-4" /> },
    { label: "Service Accounts", href: `/organizations/${orgSlug}/service-accounts`, icon: <ShieldCheck className="w-4 h-4" /> },
    { label: "Metrics", href: `/organizations/${orgSlug}/metrics`, icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Settings", href: `/organizations/${orgSlug}/settings`, icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      <PageHeader
        user={user}
        isAdmin={isAdmin}
        resource={{
          label: "Metrics",
          href: `/organizations/${orgSlug}/metrics`,
          icon: <BarChart3 className="w-3 h-3 text-stone-500" />,
          menuItems: resourceMenuItems,
        }}
        tabs={tabs}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
            Organization Metrics
          </h1>
        </div>

        <ComingSoonPlaceholder 
          title="Metrics are coming soon"
          description="We're building a comprehensive metrics dashboard to help you monitor your organization's activity and performance."
          icon={<BarChart3 className="w-6 h-6 text-amber-600" />}
          docsUrl="https://docs.wazoo.dev/metrics"
        />
      </main>
    </>
  );
}
