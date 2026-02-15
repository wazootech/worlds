import * as authkit from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

import { redirect } from "next/navigation";

import { sdk } from "@/lib/sdk";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Worlds",
};

export default async function Home(props: {
  searchParams: Promise<{ new?: string }>;
}) {
  const searchParams = await props.searchParams;
  const isCreatingNew = searchParams.new === "true";
  const userInfo = await authkit.withAuth();
  const isAdmin = !!userInfo?.user?.metadata?.admin;

  if (userInfo.user && !isCreatingNew) {
    const organizationId = userInfo.user.metadata?.organizationId as
      | string
      | undefined;
    if (organizationId) {
      const organization = await sdk.organizations.get(organizationId);
      if (organization) {
        redirect(`/organizations/${organization.slug || organization.id}`);
      }
    }
  }

  if (!userInfo.user?.id) {
    return (
      <ErrorState
        title="Account Not Found"
        message="Your local user is not initialized correctly."
      />
    );
  }

  let organization = null;
  if (!isCreatingNew) {
    try {
      const organizationId = userInfo.user.metadata?.organizationId as
        | string
        | undefined;
      organization = organizationId
        ? await sdk.organizations.get(organizationId)
        : null;
    } catch (error) {
      console.error("Failed to fetch organization:", error);
    }
  }

  if (!organization) {
    return (
      <>
        <PageHeader user={userInfo.user} isAdmin={isAdmin} />
        <CreateOrganizationForm />
      </>
    );
  }

  // Redirect to the actual organization dashboard using slug
  redirect(`/organizations/${organization.slug || organization.id}`);
}

function ErrorState({
  title,
  message,
  titleClassName = "text-stone-900 dark:text-stone-50",
}: {
  title: string;
  message: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-stone-50 dark:bg-stone-950 font-sans">
      <div className="text-center">
        <h1 className={`text-xl font-bold mb-2 ${titleClassName}`}>{title}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">{message}</p>
      </div>
    </div>
  );
}
