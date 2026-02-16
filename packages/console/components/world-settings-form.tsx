"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { updateWorld } from "@/app/actions";

export function WorldSettingsForm({
  initialLabel,
  initialSlug,
  initialDescription,
}: {
  initialLabel: string;
  initialSlug: string;
  initialDescription: string | null;
}) {
  const { organization: organizationId, world: worldId } = useParams() as {
    organization: string;
    world: string;
  };
  const [label, setLabel] = useState(initialLabel);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription || "");
  const [isPending, startTransition] = useTransition();

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateWorld(organizationId, worldId, {
          label,
          slug,
          description,
        });
      } catch (error) {
        console.error("Failed to update world:", error);
      }
    });
  };

  const isChanged =
    label !== initialLabel ||
    slug !== initialSlug ||
    description !== (initialDescription || "");

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="world-name"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
          >
            World Name
          </label>
          <input
            id="world-name"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>

        <div>
          <label
            htmlFor="world-slug"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
          >
            World Slug
          </label>
          <input
            id="world-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="w-full px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
            required
          />
          <p className="mt-1 text-[10px] text-stone-500">
            Used in URLs. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        <div>
          <label
            htmlFor="world-description"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="world-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            placeholder="Describe your world..."
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending || !isChanged}
          className="px-4 py-2 rounded-md bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
