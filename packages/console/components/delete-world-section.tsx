"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { deleteWorld } from "@/app/actions";

export function DeleteWorldSection({
  worldId,
  worldName,
}: {
  worldId: string;
  worldName: string;
}) {
  const { organization: organizationId } = useParams() as {
    organization: string;
  };
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirmName !== worldName) return;

    startTransition(async () => {
      await deleteWorld(organizationId, worldId);
      router.push("/");
    });
  };

  if (!isOpen) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-6">
        <h3 className="text-lg font-medium text-red-900 dark:text-red-200">
          Danger Zone
        </h3>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          Permanently delete this world and all of its data. This action cannot
          be undone.
        </p>
        <div className="mt-4">
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:ring-offset-stone-900 cursor-pointer"
          >
            Delete World
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-6">
      <h3 className="text-lg font-medium text-red-900 dark:text-red-200">
        Confirm World Deletion
      </h3>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
        To confirm, please type the name of the world:{" "}
        <span className="font-mono font-bold select-all">{worldName}</span>
      </p>
      <div className="mt-4 space-y-4">
        <input
          type="text"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={worldName}
          className="block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-white px-3 py-2"
          autoFocus
        />
        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            disabled={confirmName !== worldName || isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:ring-offset-stone-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Deleting..." : "I understand, delete this world"}
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setConfirmName("");
            }}
            disabled={isPending}
            className="rounded-md bg-white dark:bg-stone-800 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-stone-900 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
