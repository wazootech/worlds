import * as authkit from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import type { Metadata } from "next";
import { ServiceAccountDetails } from "@/components/service-account-details";

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
    if (!organization) return { title: "Service Account Details" };

    const sa = await sdk.serviceAccounts.get(organization.id, serviceAccountId);

    if (!sa) {
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
      <ServiceAccountDetails
        serviceAccount={sa}
        organizationId={organization.id}
        backUrl={`/organizations/${orgSlug}/service-accounts`}
      />
    </main>
  );
}
