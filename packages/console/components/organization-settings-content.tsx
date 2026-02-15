"use client";

import { useOrganization } from "@/components/organization-context";
import { BasicDetailsForm } from "@/components/basic-details-form";
import { DeleteOrganizationSection } from "@/components/delete-organization-section";

export function OrganizationSettingsContent() {
  const { organization, user } = useOrganization();

  return (
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
  );
}
