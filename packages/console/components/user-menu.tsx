"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthUser } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  user,
  onSignOut,
  isAdmin,
}: {
  user?: AuthUser | null;
  onSignOut: () => Promise<void>;
  isAdmin?: boolean;
}) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  const email = user?.email;

  if (!hasMounted) {
    return (
      <div className="p-2">
        <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 animate-pulse" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-all focus:outline-none cursor-pointer"
          title={email || "User menu"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admins" className="w-full cursor-pointer">
                Admins
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/invites" className="w-full cursor-pointer">
                Invites
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem asChild>
          <Link href="/account" className="w-full cursor-pointer">
            Account
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={async () => {
            await onSignOut();
          }}
          className="cursor-pointer"
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
