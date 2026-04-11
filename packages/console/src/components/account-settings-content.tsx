"use client";

import type { WorkOSUser } from "@/lib/auth";

export function AccountSettingsContent({ user }: { user: WorkOSUser | null }) {
  if (!user) return null;

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
            Account Settings
          </h1>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white mb-4">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                    First Name
                  </label>
                  <div className="px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-stone-900 dark:text-stone-100 italic">
                    {user.firstName || "Not set"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Last Name
                  </label>
                  <div className="px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-stone-900 dark:text-stone-100 italic">
                    {user.lastName || "Not set"}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Email Address
                  </label>
                  <div className="px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-stone-900 dark:text-stone-100 font-mono">
                    {user.email}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-stone-50 dark:bg-stone-950/50 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                User ID: <code className="font-mono">{user.id}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
