"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavTab {
  label: string;
  href: string;
  count?: number;
}

export function NavTabs({ tabs }: { tabs: NavTab[] }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/" &&
                pathname.startsWith(tab.href + "/") &&
                !tabs.some(
                  (t) =>
                    t.href !== tab.href &&
                    t.href.length > tab.href.length &&
                    pathname.startsWith(t.href),
                ));

            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={cn(
                  "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all",
                  isActive
                    ? "border-primary text-primary dark:text-primary-light"
                    : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:border-stone-700",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="flex items-center gap-2">
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
                          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 group-hover:bg-stone-200 dark:group-hover:bg-stone-700",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
