"use client";

import { useOrganization } from "@/components/organization-context";
import { ServiceAccountList } from "@/components/service-account-list";
import type { ServiceAccount } from "@wazoo/sdk";

export function ServiceAccountsContent({
  serviceAccounts,
  page,
  pageSize,
}: {
  serviceAccounts: ServiceAccount[];
  page: number;
  pageSize: number;
}) {
  const { organization } = useOrganization();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
          Service Accounts
          <span className="inline-flex items-center rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:text-stone-100">
            {serviceAccounts.length >= pageSize
              ? `${serviceAccounts.length}+`
              : serviceAccounts.length}
          </span>
        </h1>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          Create Service Account
        </button>
      </div>

      <ServiceAccountList
        initialData={serviceAccounts}
        initialPage={page}
        initialPageSize={pageSize}
      />
    </main>
  );
}
