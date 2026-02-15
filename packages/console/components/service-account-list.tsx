"use client";

import { ServiceAccount } from "@wazoo/sdk";
import { ResourceTable, Column } from "./resource-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { Key, Eye } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export function ServiceAccountList({
  initialData,
  initialPageSize,
  initialPage,
}: {
  initialData: ServiceAccount[];
  initialPageSize: number;
  initialPage: number;
}) {
  const router = useRouter();
  const { organizationId } = useParams() as { organizationId: string };
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(initialPage).withOptions({ shallow: false }),
  );
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(initialPageSize).withOptions({ shallow: false }),
  );

  const columns: Column<ServiceAccount>[] = [
    {
      key: "name",
      label: "Name / ID",
      render: (sa) => (
        <div className="flex flex-col">
          <span>{sa.label || sa.id}</span>
          <span className="text-xs text-stone-500 font-mono italic">
            {sa.id}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: () => (
        <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Active
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (sa) => new Date(sa.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "",
      className: "text-right w-[10%]",
      render: (sa) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(
              `/organizations/${organizationId}/service-accounts/${sa.id}`,
            );
          }}
          className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <ResourceTable
      columns={columns}
      data={initialData}
      onRowClick={(sa) =>
        router.push(
          `/organizations/${organizationId}/service-accounts/${sa.id}`,
        )
      }
      pagination={{
        currentPage: page,
        pageSize: pageSize,
        hasMore: initialData.length === pageSize,
        onPageChange: (p) => setPage(p),
        onPageSizeChange: (s) => {
          setPageSize(s);
          setPage(1);
        },
      }}
      emptyState={
        <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-12 text-center bg-stone-50/50 dark:bg-stone-900/50">
          <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-stone-400" />
          </div>
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            No service accounts yet
          </h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Create a service account to interact with the API programmatically.
          </p>
        </div>
      }
    />
  );
}
