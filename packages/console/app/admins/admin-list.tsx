"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { deleteOrganizationAction, toggleAdminAction } from "./actions";
import type { Organization } from "@wazoo/sdk";
import type { WorkOSUser } from "./types";
import { MoreVertical, Trash2, UserMinus, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AdminListProps = {
  organizations: Array<{ user: WorkOSUser; account: Organization | null }>;
  pageSize: number;
  nextCursor?: string;
  hasMore: boolean;
  currentCursor?: string;
};

export function AdminList({
  organizations,
  pageSize: initialPageSize,
  nextCursor,
  hasMore,
  currentCursor,
}: AdminListProps) {
  const router = useRouter();
  const [, setAfter] = useQueryState("after", parseAsString);
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(initialPageSize),
  );

  const goToNext = () => {
    if (!nextCursor) return;
    // Browser history is automatically tracked when URL changes
    setAfter(nextCursor);
  };

  const goToPrevious = () => {
    // Use browser's back button functionality
    // If there's no history (e.g., user navigated directly to this page),
    // fall back to clearing the cursor to go to first page
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // No history available, go to first page
      setAfter(null);
    }
  };

  const updatePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset to first page when changing page size
    setAfter(null);
  };

  // If we have a current cursor, we're not on the first page, so we can go back
  const hasPrevious = !!currentCursor;

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="w-full max-w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <table className="w-full">
            <thead className="bg-stone-50 dark:bg-stone-950/50">
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 py-3 pl-4 pr-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  Organization
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  Email
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
                  Admin Status
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  Plan
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  Account ID
                </th>

                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                >
                  API Key
                </th>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 relative py-3 pl-3 pr-4 sm:pr-6 whitespace-nowrap"
                >
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900">
              {organizations.map(({ user, account }) => (
                <AdminRow key={user.id} user={user} account={account} />
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-sm text-stone-500 dark:text-stone-400"
                  >
                    No organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
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
            Showing {organizations.length} organization
            {organizations.length !== 1 ? "s" : ""}
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

function AdminRow({
  user,
  account,
}: {
  user: WorkOSUser;
  account: Organization | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdmin = !!user.metadata?.admin;
  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "N/A";

  const handleToggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await toggleAdminAction(user.id, !isAdmin);
      if (!result.success) {
        setError(result.error || "Failed to update admin status");
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteOrganizationAction(user.id);
      if (result.success) {
        setShowDeleteDialog(false);
      } else {
        setError(result.error || "Failed to delete organization");
      }
    });
  };

  const handleCopyAccountId = () => {
    if (!accountId || accountId === "-") return;
    navigator.clipboard.writeText(accountId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Format account data
  const plan = account?.plan || "No plan";
  const accountId = account?.id || "-";

  return (
    <tr>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-stone-900 dark:text-white">
        {displayName}
      </td>
      <td className="px-3 py-4 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap min-w-[150px]">
        {user.email || "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500 dark:text-stone-400">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        {isAdmin ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Admin
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-300">
            User
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500 dark:text-stone-400">
        {plan}
      </td>
      <td className="px-3 py-4 text-sm text-stone-500 dark:text-stone-400 font-mono whitespace-nowrap min-w-[120px]">
        {accountId !== "-" ? (
          <button
            onClick={handleCopyAccountId}
            className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors cursor-pointer text-left flex items-center gap-1 group"
            title="Click to copy Account ID"
          >
            {accountId}
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
        ) : (
          "-"
        )}
      </td>

      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        <div className="flex items-center justify-end gap-2">
          {error && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {error}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 cursor-pointer"
                disabled={isPending}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleToggle}
                className="cursor-pointer"
                variant={isAdmin ? "destructive" : "default"}
              >
                {isAdmin ? (
                  <>
                    <UserMinus className="mr-2 h-4 w-4" />
                    <span>Remove Admin</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Make Admin</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Organization</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Organization</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete <strong>{displayName}</strong>
                  ? This will remove the organization from the platform and
                  delete their account on the Worlds API. This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Delete Organization"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </td>
    </tr>
  );
}
