"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CreateWorldDialog } from "./create-world-dialog";

export function CreateWorldButton() {
  const { organization: organizationId } = useParams() as {
    organization: string;
  };
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`
          inline-flex w-full sm:w-auto items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wide
          transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
          dark:focus:ring-offset-stone-900 disabled:opacity-50 disabled:pointer-events-none
          bg-primary text-white hover:bg-primary-dark shadow-sm cursor-pointer
        `}
      >
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
      </button>

      <CreateWorldDialog
        organizationId={organizationId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
