"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions";

export function DeleteAccountSection({
  userEmail,
}: {
  userEmail: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirmEmail !== userEmail) return;

    startTransition(async () => {
      await deleteAccount();
    });
  };

  if (!isOpen) {
    return (
      <div className="mt-12 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-6">
        <h3 className="text-lg font-medium text-red-900 dark:text-red-200">
          Danger Zone
        </h3>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          Permanently delete your account and all of your worlds. This action
          cannot be undone.
        </p>
        <div className="mt-4">
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:ring-offset-stone-900 cursor-pointer"
          >
            Delete Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-6">
      <h3 className="text-lg font-medium text-red-900 dark:text-red-200">
        Confirm Account Deletion
      </h3>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
        To confirm, please type your email address:{" "}
        <span className="font-mono font-bold select-all">{userEmail}</span>
      </p>
      <div className="mt-4 space-y-4">
        <input
          type="text"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder={userEmail || ""}
          className="block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-white px-3 py-2"
          autoFocus
        />
        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            disabled={confirmEmail !== userEmail || isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:ring-offset-stone-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Deleting..." : "I understand, delete my account"}
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setConfirmEmail("");
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
