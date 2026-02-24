"use client";

import { startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { World } from "@wazoo/sdk";

import { PixelPlanet } from "./pixel-planet/pixel-planet";
import { getSeedFromId } from "./pixel-planet/lib/seed-utils";

export function WorldItem({
  world,
  organizationId,
}: {
  world: World;
  organizationId: string;
}) {
  const router = useRouter();

  const handlePlanetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!world.slug) throw new Error("World is missing a slug");
    const targetUrl = `/${organizationId}/${world.slug}?lounge=true`;

    // Use View Transition API if available
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      document.startViewTransition(() => {
        startTransition(() => {
          router.push(targetUrl);
        });
      });
    } else {
      startTransition(() => {
        router.push(targetUrl);
      });
    }
  };

  const seed = getSeedFromId(world.id);

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm transition-shadow hover:shadow-md group">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePlanetClick}
              className="h-16 w-16 overflow-hidden rounded-full bg-black/5 dark:bg-black/40 flex items-center justify-center relative hover:scale-110 transition-transform cursor-pointer border-4 border-white dark:border-stone-800 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900"
              title="View Planet"
            >
              <PixelPlanet type="earth" seed={seed} />
            </button>
            <div className="flex flex-col justify-center min-w-0">
              <h3
                className="text-lg font-semibold text-stone-900 dark:text-white truncate"
                title={world.label || world.id}
              >
                <Link
                  href={`/${organizationId}/${world.slug}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {world.label || world.id}
                </Link>
              </h3>
            </div>
          </div>
        </div>

        <div className="mb-4 min-h-[3rem]">
          <p
            className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2"
            title={world.description || undefined}
          >
            {world.description || (
              <span className="italic text-stone-400">No description</span>
            )}
          </p>
        </div>

        <div className="mb-4 text-xs text-stone-500 dark:text-stone-400 space-y-1">
          <p>Updated {new Date(world.updatedAt).toLocaleDateString()}</p>
        </div>
        <div className="text-sm text-stone-500 dark:text-stone-400">
          <Link
            href={`/${organizationId}/${world.slug}`}
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
          >
            View details
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 ml-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
