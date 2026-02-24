"use client";

import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import type { AuthOrganization } from "@/lib/auth";
import { ResourceTable, Column } from "@/components/resource-table";

type OrgListProps = {
  organizations: AuthOrganization[];
  pageSize: number;
  nextCursor?: string;
  hasMore: boolean;
  currentCursor?: string;
};

export function OrgList({
  organizations,
  pageSize: initialPageSize,
  nextCursor,
  hasMore,
  currentCursor,
}: OrgListProps) {
  const router = useRouter();
  const [, setAfter] = useQueryState("after", parseAsString);
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(initialPageSize),
  );

  const columns: Column<AuthOrganization>[] = [
    {
      key: "name",
      label: "Name",
      render: (org) => (
        <span className="font-medium text-stone-900 dark:text-white">
          {org.name}
        </span>
      ),
    },
    {
      key: "id",
      label: "ID",
      render: (org) => <span className="font-mono text-xs">{org.id}</span>,
    },
    {
      key: "slug",
      label: "Slug",
      render: (org) => org.slug,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (org) =>
        org.createdAt ? new Date(org.createdAt).toLocaleDateString() : "-",
    },
  ];

  const hasPrevious = !!currentCursor;

  return (
    <ResourceTable
      columns={columns}
      data={organizations}
      onRowClick={(org) => {
        if (!org.slug) throw new Error("Organization is missing a slug");
        router.push(`/${org.slug}`);
      }}
      pagination={{
        hasMore,
        hasPrevious,
        pageSize,
        onPageChange: (newPage) => {
          if (newPage > (currentCursor ? 2 : 1)) {
            if (nextCursor) setAfter(nextCursor);
          } else {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              setAfter(null);
            }
          }
        },
        onPageSizeChange: (newSize) => {
          setPageSize(newSize);
          setAfter(null);
        },
      }}
      emptyState={
        <div className="px-3 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
          No organizations found.
        </div>
      }
    />
  );
}
