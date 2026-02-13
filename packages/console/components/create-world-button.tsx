"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorld } from "@/app/actions";

export function CreateWorldButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createWorld();
      if (result && !result.success) {
        alert(`Failed to create world: ${result.error}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <button
      onClick={handleCreate}
      disabled={isPending}
      className={`
        inline-flex w-full sm:w-auto items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wide
        transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
        dark:focus:ring-offset-stone-900 disabled:opacity-50 disabled:pointer-events-none
        bg-primary text-white hover:bg-primary-dark shadow-sm cursor-pointer
      `}
    >
      {isPending ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Creating...
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mr-2 h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Create
        </>
      )}
    </button>
  );
}
