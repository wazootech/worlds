"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorld } from "@/app/actions";
import { Plus, X } from "lucide-react";

export function CreateWorldDialog({
  organizationSlug,
  isOpen,
  onClose,
}: {
  organizationSlug: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    if (!isSlugEdited) {
      setSlug(slugify(newLabel));
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createWorld(organizationSlug, label, slug);
      if (result.success && result.slug) {
        onClose();
        router.push(`/${organizationSlug}/${result.slug}`);
      } else {
        alert(`Failed to create world: ${result.error}`);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
            Create New World
          </h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="world-label"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              World Name
            </label>
            <input
              id="world-label"
              type="text"
              placeholder="My Awesome World"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 px-4 py-3 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all text-sm"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="world-slug"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              World Slug
            </label>
            <div className="relative">
              <input
                id="world-slug"
                type="text"
                placeholder="my-awesome-world"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setIsSlugEdited(true);
                }}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 px-4 py-3 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all text-sm"
                required
              />
            </div>
            <p className="text-[10px] text-stone-500">
              Unique within your organization. Lowercase, numbers, and hyphens.
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending || !label.trim() || !slug.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-stone-900 shadow-md hover:bg-stone-800 dark:hover:bg-stone-100 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isPending ? "Creating..." : "Create World"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
