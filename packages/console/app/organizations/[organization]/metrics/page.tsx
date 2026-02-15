import { OrganizationMetricsContent } from "@/components/organization-metrics-content";
import { sdk } from "@/lib/sdk";
import { notFound } from "next/navigation";
import { Metadata } from "next";

type Params = { organization: string };

export const metadata: Metadata = {
  title: "Metrics",
};

export default async function MetricsPage(props: { params: Promise<Params> }) {
  const { organization: organizationId } = await props.params;

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

  return <OrganizationMetricsContent />;
}
