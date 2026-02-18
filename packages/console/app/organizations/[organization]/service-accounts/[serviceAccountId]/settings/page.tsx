import * as authkit from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import type { Metadata } from "next";
import { ServiceAccountSettings } from "@/components/service-account-settings";

type Params = { organization: string; serviceAccountId: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationSlug, serviceAccountId } =
    await props.params;

  try {
    const { getOrganizationManagement } = await import("@/lib/auth");
    const orgMgmt = await getOrganizationManagement();
    const organization = await orgMgmt.getOrganization(organizationSlug);
    if (!organization) return { title: "Settings | Service Account" };

    const sa = await sdk.serviceAccounts.get(organization.id, serviceAccountId);

    if (!sa) {
      return { title: "Settings | Service Account" };
    }

    return {
      title: `Settings - ${sa.label || sa.id} | Service Accounts`,
    };
  } catch {
    return {
      title: "Settings | Service Accounts",
    };
  }
}

export default async function ServiceAccountSettingsPage(props: {
  params: Promise<Params>;
}) {
  const { organization: organizationSlug, serviceAccountId } =
    await props.params;

  // Check authentication
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  // Fetch data
  const { getOrganizationManagement } = await import("@/lib/auth");
  const orgMgmt = await getOrganizationManagement();

  const organization = await orgMgmt
    .getOrganization(organizationSlug)
    .catch(() => null);

  if (!organization) {
    notFound();
  }

  const sa = await sdk.serviceAccounts
    .get(organization.id, serviceAccountId)
    .catch(() => null);

  if (!sa) {
    notFound();
  }

  const orgSlug = organization.metadata.slug || organization.id;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <ServiceAccountSettings
        serviceAccount={sa}
        organizationId={organization.id}
        organizationSlug={orgSlug}
      />
    </main>
  );
}
