"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/app/actions";
import { Building2, Plus, Sparkles } from "lucide-react";

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
      .replace(/[^\a-z0-9 -]/g, "")
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
        router.push(`/organizations/${result.slug}`);
      } else {
        setError(result.error ?? "Failed to create organization");
      }
    });
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6 bg-stone-50 dark:bg-stone-950">
      <div className="w-full max-w-xl">
        <div className="relative overflow-hidden rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl p-8 md:p-12">
          {/* Background Decorative Element */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-stone-100 dark:bg-stone-800 rounded-full blur-3xl opacity-50 pointer-events-none" />

          <div className="relative flex flex-col items-center text-center space-y-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white ring-1 ring-stone-200 dark:ring-stone-700">
              <Building2 className="h-10 w-10" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
                Ready to build?
              </h1>
              <p className="max-w-md mx-auto text-lg text-stone-500 dark:text-stone-400">
                Give your organization a name to start creating worlds and
                managing your API keys.
              </p>
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="org-name"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 text-left"
                >
                  Organization Name
                </label>
                <input
                  id="org-name"
                  type="text"
                  placeholder="Acme Corp"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 px-4 py-3 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all text-left"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="org-slug"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300 text-left"
                >
                  Organization Slug
                </label>
                <div className="relative">
                  <input
                    id="org-slug"
                    type="text"
                    placeholder="acme-corp"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setIsSlugEdited(true);
                    }}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 px-4 py-3 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all text-left"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-stone-500 uppercase">
                    Lower-case and Hyphens
                  </div>
                </div>
              </div>

              {error && (
                <div className="w-full p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 text-left">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {error}
                  </p>
                </div>
              )}

              <div className="w-full pt-2">
                <button
                  onClick={handleCreate}
                  disabled={isPending || !name.trim() || !slug.trim()}
                  className="group relative w-full overflow-hidden rounded-2xl bg-stone-900 dark:bg-white px-8 py-4 text-lg font-semibold text-white dark:text-stone-900 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                >
                  <div className="relative flex items-center justify-center gap-2">
                    {isPending ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Creating Organization...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        <span>Create Organization</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm font-medium text-stone-400 dark:text-stone-500">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Unlimited Worlds</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Local-First API</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
