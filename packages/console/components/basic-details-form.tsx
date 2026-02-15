"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { updateOrganization } from "@/app/actions";

export function BasicDetailsForm({
  initialLabel,
  initialSlug,
}: {
  initialLabel: string | null;
  initialSlug: string | null;
}) {
  const { organization: organizationId } = useParams() as { organization: string };
  const [label, setLabel] = useState(initialLabel || "");
  const [slug, setSlug] = useState(initialSlug || "");
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
        await updateOrganization(organizationId, {
          label,
          slug,
        });
      } catch (error) {
        console.error("Failed to update organization:", error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label
          htmlFor="organization-name"
          className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
        >
          Organization Name
        </label>
        <input
          id="organization-name"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          required
        />
      </div>
      <div>
        <label
          htmlFor="organization-slug"
          className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
        >
          Organization Slug
        </label>
        <input
          id="organization-slug"
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
        <button
          type="submit"
          disabled={isPending || (label === initialLabel && slug === initialSlug)}
          className="px-4 py-2 rounded-md bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
