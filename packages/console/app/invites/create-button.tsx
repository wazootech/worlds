"use client";

import { useTransition } from "react";
import { createInviteAction } from "./actions";

export function CreateInviteButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await createInviteAction();
        })
      }
      disabled={isPending}
      className="rounded-md bg-stone-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300 transition-colors"
    >
      {isPending ? "Creating..." : "Create Invite"}
    </button>
  );
}
