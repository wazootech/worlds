"use client";

import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
};

export type PaginationProps = {
  currentPage?: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSize: number;
  totalCount?: number;
  hasPrevious?: boolean;
};

type ResourceTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  pagination?: PaginationProps;
  emptyState: ReactNode;
  loading?: boolean;
};

export function ResourceTable<T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  pagination,
  emptyState,
  loading,
}: ResourceTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-300 border-t-stone-600 dark:border-stone-700 dark:border-t-stone-400" />
        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
          Loading...
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        {emptyState}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800">
            <thead className="bg-stone-50 dark:bg-stone-950/50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`py-3 px-4 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider ${column.className || ""}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900">
              {data.map((item) => (
                <tr
                  key={item.id}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={
                    onRowClick
                      ? "cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                      : ""
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`py-4 px-4 text-sm text-stone-900 dark:text-stone-100 ${column.className || ""}`}
                    >
                      {column.render
                        ? column.render(item)
                        : ((item as Record<string, unknown>)[
                            column.key
                          ] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label
                htmlFor="page-size"
                className="text-sm text-stone-600 dark:text-stone-400"
              >
                Show:
              </label>
              <select
                id="page-size"
                value={pagination.pageSize}
                onChange={(e) =>
                  pagination.onPageSizeChange(Number(e.target.value))
                }
                className="rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-sm text-stone-900 dark:text-stone-100 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <span className="text-sm text-stone-600 dark:text-stone-400">
              Showing {data.length}{" "}
              {pagination.totalCount ? `of ${pagination.totalCount}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                pagination.onPageChange((pagination.currentPage || 1) - 1)
              }
              disabled={
                pagination.hasPrevious !== undefined
                  ? !pagination.hasPrevious
                  : (pagination.currentPage || 1) <= 1
              }
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            <button
              onClick={() =>
                pagination.onPageChange((pagination.currentPage || 1) + 1)
              }
              disabled={!pagination.hasMore}
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
