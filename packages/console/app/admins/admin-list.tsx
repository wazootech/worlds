"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { deleteUserAction, toggleAdminAction } from "./actions";
import type { AuthOrganization } from "@/lib/auth";
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
import { ResourceTable, Column } from "@/components/resource-table";

type AdminItem = {
  id: string; // for ResourceTable key
  user: WorkOSUser;
  organization: AuthOrganization | null;
};

type AdminListProps = {
  organizations: Array<{
    user: WorkOSUser;
    organization: AuthOrganization | null;
  }>;
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

  const data: AdminItem[] = organizations.map((item) => ({
    id: item.user.id,
    user: item.user,
    organization: item.organization,
  }));

  const columns: Column<AdminItem>[] = [
    {
      key: "user",
      label: "User",
      render: (item) => (
        <span className="font-medium text-stone-900 dark:text-white">
          {item.user.firstName || item.user.lastName
            ? `${item.user.firstName || ""} ${item.user.lastName || ""}`.trim()
            : "N/A"}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (item) => item.user.email || "-",
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (item) =>
        item.user.createdAt
          ? new Date(item.user.createdAt).toLocaleDateString()
          : "-",
    },
    {
      key: "status",
      label: "Role",
      render: (item) => {
        const isAdmin = !!item.user.metadata?.admin;
        return isAdmin ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Admin
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-300">
            User
          </span>
        );
      },
    },
    {
      key: "organization",
      label: "Organization",
      render: (item) => (
        <div className="flex flex-col">
          <span className="text-stone-900 dark:text-white">
            {item.organization?.name || "No organization"}
          </span>
          {item.organization && (
            <span className="font-mono text-[10px] text-stone-500">
              {item.organization.id}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (item) => <AdminActions user={item.user} />,
    },
  ];

  const hasPrevious = !!currentCursor;

  return (
    <ResourceTable
      columns={columns}
      data={data}
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
          No users found.
        </div>
      }
    />
  );
}

function AdminActions({ user }: { user: WorkOSUser }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdmin = !!user.metadata?.admin;

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
      const result = await deleteUserAction(user.id);
      if (result.success) {
        setShowDeleteDialog(false);
      } else {
        setError(result.error || "Failed to delete user");
      }
    });
  };

  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : user.email || "N/A";

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
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
            <span>Delete User</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{displayName}</strong>?
              This will remove the user and their associated organization from
              the platform. This action cannot be undone.
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
              {isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
