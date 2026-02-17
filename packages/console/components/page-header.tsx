import Link from "next/link";
import { ReactNode } from "react";
import Image from "next/image";
import { UserMenu } from "./user-menu";
import { signOutAction } from "@/app/actions";
import { AuthUser } from "@/lib/auth";
import {
  OrganizationSwitcher,
  ResourceBreadcrumb,
} from "./organization-switcher";
import { NavTab, NavTabs } from "./nav-tabs";

export function PageHeader({
  user,
  children,
  isAdmin,
  resource,
  tabs,
}: {
  user?: AuthUser | null;
  children?: ReactNode;
  isAdmin?: boolean;
  resource?: ResourceBreadcrumb | ResourceBreadcrumb[];
  tabs?: NavTab[];
}) {
  return (
    <div className="sticky top-0 z-50">
      <nav className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {children}
            <Link
              href={
                (user?.metadata?.organizationId as string)
                  ? `/organizations/${user?.metadata?.organizationId}`
                  : "/"
              }
              className="flex items-center py-1.5 group transition-all"
            >
              <div className="relative w-6 h-6 rounded-full overflow-hidden shadow-sm transition-colors">
                <Image
                  src="/wazoo.svg"
                  alt="Wazoo Logo"
                  fill
                  className="object-cover logo-image p-0.5"
                />
              </div>
            </Link>

            <OrganizationSwitcher resource={resource} />
          </div>
          <div className="flex items-center space-x-4">
            <UserMenu user={user} onSignOut={signOutAction} isAdmin={isAdmin} />
          </div>
        </div>
      </nav>
      {tabs && <NavTabs tabs={tabs} />}
    </div>
  );
}
