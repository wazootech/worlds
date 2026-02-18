import { OrganizationSettingsContent } from "@/components/organization-settings-content";
import { notFound } from "next/navigation";
import { Metadata } from "next";

type Params = { organization: string };

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage(props: { params: Promise<Params> }) {
  const { organization: organizationId } = await props.params;

  // Fetch organization (verify organization existence)
  let organization;
  try {
    const { getOrganizationManagement } = await import("@/lib/auth");
    const orgMgmt = await getOrganizationManagement();
    organization = await orgMgmt.getOrganization(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    notFound();
  }

  if (!organization) {
    notFound();
  }

  return <OrganizationSettingsContent />;
}
