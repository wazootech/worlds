import { withAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AccountSettingsContent } from "@/components/account-settings-content";
import { Metadata } from "next";
import { User } from "lucide-react";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default async function AccountPage() {
  const { user } = await withAuth();
  const isAdmin = !!user?.metadata?.admin;

  return (
    <>
      <PageHeader
        user={user}
        isAdmin={isAdmin}
        resource={{
          label: "Account Settings",
          href: "/account",
          icon: <User className="w-3 h-3 text-stone-500" />,
        }}
      />
      <AccountSettingsContent user={user} />
    </>
  );
}
