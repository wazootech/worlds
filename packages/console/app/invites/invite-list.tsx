"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { parseAsInteger, useQueryState } from "nuqs";
import { InviteRecord } from "@fartlabs/worlds/internal";
import { deleteInvitesAction } from "./actions";

type InviteListProps = {
  invites: InviteRecord[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function InviteList({
  invites,
  page: initialPage,
  pageSize: initialPageSize,
  hasMore,
}: InviteListProps) {
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(initialPage),
  );
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(initialPageSize),
  );
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const goToNext = () => {
    if (!hasMore) return;
    setPage(page + 1);
  };

  const goToPrevious = () => {
    if (page <= 1) return;
    setPage(page - 1);
  };

  const updatePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset to first page when changing page size
    setPage(1);
  };

  const hasPrevious = page > 1;

  const toggleAll = () => {
    if (selectedCodes.size === invites.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(invites.map((i) => i.code)));
    }
  };

  const toggleOne = (code: string) => {
    const next = new Set(selectedCodes);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setSelectedCodes(next);
  };

  const handleDeleteSelected = () => {
    if (selectedCodes.size === 0) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedCodes.size} invites?`)
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteInvitesAction(Array.from(selectedCodes));
      if (result.success) {
        setSelectedCodes(new Set());
      }
    });
  };

  const isAllSelected = invites.length > 0 &&
    selectedCodes.size === invites.length;
  const isSomeSelected = selectedCodes.size > 0 &&
    selectedCodes.size < invites.length;

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between">
        <div className="text-sm text-stone-500 dark:text-stone-400">
          {selectedCodes.size > 0
            ? <span>{selectedCodes.size} items selected</span>
            : <span>{invites.length} total invites</span>}
        </div>
        {selectedCodes.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={isPending}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPending
              ? "Deleting..."
              : `Delete Selected (${selectedCodes.size})`}
          </button>
        )}
      </div>

      <div className="w-full max-w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <table className="w-full">
            <thead className="bg-stone-50 dark:bg-stone-950/50">
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 py-3 pl-4 pr-3 text-left w-10"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300 text-stone-600 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-offset-stone-900"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={toggleAll}
                  />
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  Code
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  Created At
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  Redeemed At
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  Redeemed By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900">
              {invites.map((invite) => (
                <InviteRow
                  key={invite.code}
                  invite={invite}
                  isSelected={selectedCodes.has(invite.code)}
                  onToggle={() => toggleOne(invite.code)}
                />
              ))}
              {invites.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-stone-500 dark:text-stone-400"
                  >
                    No invites found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between px-1">
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
              value={pageSize}
              onChange={(e) => updatePageSize(Number(e.target.value))}
              className="rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-sm text-stone-900 dark:text-stone-100 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <span className="text-sm text-stone-600 dark:text-stone-400">
            Showing {invites.length} invite{invites.length !== 1 ? "s" : ""}
            {hasMore && " (more available)"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            disabled={!hasPrevious}
            className="rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            onClick={goToNext}
            disabled={!hasMore}
            className="rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
function InviteRow({
  invite,
  isSelected,
  onToggle,
}: {
  invite: InviteRecord;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyRedeemerId = () => {
    if (!invite.redeemedBy) return;
    navigator.clipboard.writeText(invite.redeemedBy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <tr className={isSelected ? "bg-stone-50 dark:bg-stone-800/30" : undefined}>
      <td className="py-4 pl-4 pr-3 text-left w-10">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-stone-300 text-stone-600 focus:ring-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-offset-stone-900 cursor-pointer"
          checked={isSelected}
          onChange={onToggle}
        />
      </td>
      <td className="whitespace-nowrap py-4 px-3 text-sm font-medium text-stone-900 dark:text-white font-mono">
        <Link
          href={`/invites/${invite.code}`}
          className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          {invite.code}
        </Link>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500 dark:text-stone-400">
        {invite.createdAt
          ? new Date(invite.createdAt).toLocaleDateString()
          : "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500 dark:text-stone-400">
        {invite.redeemedAt
          ? new Date(invite.redeemedAt).toLocaleDateString()
          : "-"}
      </td>
      <td className="px-3 py-4 text-sm text-stone-500 dark:text-stone-400 font-mono whitespace-nowrap min-w-[150px]">
        {invite.redeemedBy
          ? (
            <button
              onClick={handleCopyRedeemerId}
              className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors cursor-pointer text-left flex items-center gap-1 group"
              title="Click to copy Account ID"
            >
              {`${invite.redeemedBy.slice(0, 4)}...${
                invite.redeemedBy.slice(-4)
              }`}
              <span
                className={`text-[10px] uppercase font-sans font-bold px-1 rounded transition-opacity ${
                  isCopied
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 opacity-100"
                    : "opacity-0 group-hover:opacity-40"
                }`}
              >
                {isCopied ? "Copied" : "Copy"}
              </span>
            </button>
          )
          : (
            "-"
          )}
      </td>
    </tr>
  );
}
