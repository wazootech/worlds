"use client";

import { useState, useTransition } from "react";
import type { World } from "@wazoo/sdk";
import { updateWorld } from "./actions";
import { DeleteWorldSection } from "@/components/delete-world-section";

export function WorldSettings({ world }: { world: World }) {
  const [label, setName] = useState(world.label);
  const [description, setDescription] = useState(world.description || "");
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    label !== world.label || description !== (world.description || "");

  const handleSave = () => {
    startTransition(async () => {
      await updateWorld(world.id, {
        label: label !== world.label ? label : undefined,
        description:
          description !== (world.description || "") ? description : undefined,
      });
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* General Settings */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-white">
            General Settings
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Manage your world&apos;s basic information.
          </p>
        </div>

        <div className="p-5 space-y-6">
          {/* World Name */}
          <div className="space-y-2">
            <label
              htmlFor="label"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              World Name
            </label>
            <input
              id="label"
              type="text"
              value={label}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow"
              placeholder="Enter world label"
            />
          </div>

          {/* World Description */}
          <div className="space-y-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow resize-y"
              placeholder="Describe your world..."
            />
          </div>

          {/* Save Changes Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={isPending || !hasChanges}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <DeleteWorldSection worldId={world.id} worldName={world.label || ""} />
    </div>
  );
}
