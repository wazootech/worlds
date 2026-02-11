import Link from "next/link";
import { ReactNode } from "react";
import Image from "next/image";
import { UserMenu } from "./user-menu";
import { signOutAction } from "@/app/actions";

export function PageHeader({
  accountId,
  children,
  isAdmin,
}: {
  accountId?: string | null;
  children?: ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <nav className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {children}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-6 h-6 rounded-full overflow-hidden shadow-sm transition-colors">
              <Image
                src="https://wazoo.tech/wazoo.svg"
                alt="Wazoo Logo"
                fill
                className="object-cover logo-image"
              />
            </div>
            <span className="text-sm font-code tracking-tight text-stone-900 dark:text-stone-100 group-hover:text-primary transition-colors">
              Worlds Console
            </span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {accountId && (
            <Link
              href={`/accounts/${accountId}#api-keys`}
              className="text-xs font-medium px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              API Key
            </Link>
          )}
          <UserMenu
            accountId={accountId}
            onSignOut={signOutAction}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </nav>
  );
}
