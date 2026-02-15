"use client";

import { useState } from "react";
import type { ServiceAccount } from "@wazoo/sdk";
import { useRouter } from "next/navigation";
import { Loader2, Key, Save, Trash2 } from "lucide-react";
import {
  updateServiceAccount,
  rotateServiceAccountKey,
  deleteServiceAccount,
} from "@/app/actions";

export function ServiceAccountSettings({
  serviceAccount,
  organizationId,
}: {
  serviceAccount: ServiceAccount;
  organizationId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Update Form State
  const [label, setLabel] = useState(serviceAccount.label || "");
  const [description, setDescription] = useState(
    serviceAccount.description || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  // Rotate Key State
  const [isRotating, setIsRotating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await updateServiceAccount(organizationId, serviceAccount.id, {
        label,
        description,
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update settings",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRotateKey = async () => {
    if (
      !confirm(
        "Are you sure you want to rotate the API key? The old key will stop working immediately.",
      )
    ) {
      return;
    }

    setIsRotating(true);
    setError(null);
    try {
      const newSa = await rotateServiceAccountKey(
        organizationId,
        serviceAccount.id,
      );
      setNewKey(newSa.apiKey); // Assuming create returns apiKey
      // We need to redirect because the ID changed
      // Wait, rotateServiceAccountKey returns the new SA object.
      // And we know the ID changed.
      // The user needs to see the new key FIRST, then we redirect?
      // Or we show a modal?
      // Let's show the key and a button to "Go to new Service Account"
      // Actually, if we redirect immediately, they lose the key if they didn't copy it.
      // But the key is visible on the details page? No, keys are usually only shown once.
      // Wait, does `sdk.organizations.serviceAccounts.create` return the key? Yes.
      // Does `get` return the key? No (usually).
      // So this IS the only time they see the key.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate key");
      setIsRotating(false); // Only stop rotating if error, otherwise keep state to show key
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this service account? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await deleteServiceAccount(organizationId, serviceAccount.id);
      router.push(`/organizations/${organizationId}/service-accounts`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete service account",
      );
      setIsDeleting(false);
    }
  };

  if (newKey) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full">
              <Key className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
              Key Rotated Successfully
            </h2>
          </div>

          <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-4">
            The API key has been rotated. The old key is no longer valid.
            <br />
            <strong>
              This is the only time you will see this key. Copy it now.
            </strong>
          </p>

          <div className="bg-white dark:bg-black border border-emerald-200 dark:border-emerald-800 rounded px-3 py-2 font-mono text-sm break-all select-all mb-6">
            {newKey}
          </div>

          <button
            onClick={() =>
              router.push(`/organizations/${organizationId}/service-accounts`)
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* General Settings */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-white">
          General Settings
        </h2>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label
                htmlFor="label"
                className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
              >
                Label
              </label>
              <input
                type="text"
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 bg-transparent border border-stone-300 dark:border-stone-700 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 dark:text-white"
                placeholder="My Service Account"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-transparent border border-stone-300 dark:border-stone-700 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 dark:text-white"
                placeholder="Used for..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* API Key Rotation */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-white">
          API Key
        </h2>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium text-stone-900 dark:text-white mb-1">
                Rotate API Key
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Rotating the API key will immediately invalidate the current
                key. Any applications using the old key will need to be updated.
                <br />
                <strong>
                  Note: This will also change the Service Account ID.
                </strong>
              </p>
            </div>
            <button
              onClick={handleRotateKey}
              disabled={isRotating}
              className="flex items-center gap-2 px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-md text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 bg-transparent flex-shrink-0"
            >
              {isRotating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              Rotate Key
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-500">
          Danger Zone
        </h2>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium text-red-900 dark:text-red-100 mb-1">
                Delete Service Account
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300/80">
                Deleted service accounts cannot be recovered. All API access
                using this account will stop immediately.
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
