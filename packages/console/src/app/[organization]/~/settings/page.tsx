import { getWorkOS } from "@/lib/platform";
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
    const workos = await getWorkOS();

    organization = await workos.getOrganizationBySlug(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    notFound();
  }

  if (!organization) {
    notFound();
  }

  return <OrganizationSettingsContent />;
}
