"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/app/actions";
import { Building2, Info, Plus } from "lucide-react";

export function CreateOrganizationForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugEdited, setIsSlugEdited] = useState(false);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!isSlugEdited) {
      setSlug(slugify(newName));
    }
  };

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createOrganization(name, slug);
      if (result.success && result.slug) {
        router.push(`/${result.slug}`);
      } else {
        setError(result.error ?? "Failed to create organization");
      }
    });
  };

  return (
    <div className="flex-1 w-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-h-[calc(100vh-64px)] font-sans flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8 flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 shadow-sm">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Create a new organization
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Organizations contain your project&apos;s worlds, data, and API
              keys. Required fields are marked with an asterisk (*).
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="space-y-6 max-w-2xl">
          {/* Name and Slug Inputs */}
          <div className="space-y-6">
            <div className="space-y-2 w-full">
              <label htmlFor="org-name" className="block text-sm font-semibold">
                Organization name *
              </label>
              <input
                id="org-name"
                type="text"
                placeholder="Acme Corp"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2.5 text-sm focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-100 transition-colors shadow-sm"
              />
            </div>

            <div className="space-y-2 w-full">
              <label htmlFor="org-slug" className="block text-sm font-semibold">
                Organization slug *
              </label>
              <input
                id="org-slug"
                type="text"
                placeholder="acme-corp"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setIsSlugEdited(true);
                }}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2.5 text-sm focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-100 transition-colors shadow-sm font-mono"
              />
            </div>
          </div>

          <p className="text-sm text-stone-500 dark:text-stone-400 flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-stone-400" />
            <span>
              Great organization names are short and memorable. The slug is used
              in your API URLs.
            </span>
          </p>

          {error && (
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <hr className="border-stone-200 dark:border-stone-800 my-8" />

          <div className="pt-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !name.trim() || !slug.trim()}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-stone-900 dark:bg-stone-100 px-6 py-2.5 text-sm font-semibold text-white dark:text-stone-900 shadow-sm transition-all hover:bg-stone-800 dark:hover:bg-white active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Creating organization...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create organization</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
