"use client";

import { useWorld } from "@/components/world-context";
import { WorldSettingsForm } from "@/components/world-settings-form";
import { DeleteWorldSection } from "@/components/delete-world-section";

export function WorldSettingsContent() {
  const { world } = useWorld();
  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
              World Settings
            </h1>
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Manage your world&apos;s details and identification.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white mb-4">
                Basic Details
              </h2>
              <WorldSettingsForm
                initialLabel={world.label}
                initialSlug={world.slug}
                initialDescription={world.description}
              />
            </div>
            <div className="bg-stone-50 dark:bg-stone-950/50 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Internal World ID: <code className="font-mono">{world.id}</code>
              </p>
            </div>
          </div>

          <DeleteWorldSection worldId={world.id} worldName={world.label} />
        </div>
      </div>
    </main>
  );
}
