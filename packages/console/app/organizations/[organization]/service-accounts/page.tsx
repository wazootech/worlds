import { ServiceAccountsContent } from "@/components/service-accounts-content";
import { sdk } from "@/lib/sdk";
import type { ServiceAccount } from "@wazoo/sdk";
import { notFound } from "next/navigation";
import { Metadata } from "next";

type Params = { organization: string };
type SearchParams = { page?: string; pageSize?: string };

export const metadata: Metadata = {
  title: "Service Accounts",
};

export default async function ServiceAccountsPage(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { organization: organizationId } = await props.params;
  const searchParams = await props.searchParams;

  const page = parseInt(searchParams.page || "1");
  const pageSize = parseInt(searchParams.pageSize || "20");

  // Fetch organization (verify organization existence)
  let organization;
  try {
    organization = await sdk.organizations.get(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    notFound();
  }

  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;

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

  return (
    <ServiceAccountsContent
      serviceAccounts={serviceAccounts}
      page={page}
      pageSize={pageSize}
    />
  );
}
