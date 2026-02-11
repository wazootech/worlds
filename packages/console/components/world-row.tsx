"use client";

import { startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WorldRecord } from "@fartlabs/worlds";

import { PixelPlanet } from "./pixel-planet/pixel-planet";
import { getSeedFromId } from "./pixel-planet/lib/seed-utils";

export function WorldRow({ world }: { world: WorldRecord }) {
  const router = useRouter();

  const handlePlanetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetUrl = `/worlds/${world.id}?lounge=true`;

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
    <tr className="group border-b border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors">
      <td className="py-2 pl-4 pr-3 w-[48px]">
        <button
          onClick={handlePlanetClick}
          className="h-8 w-8 overflow-hidden rounded-full bg-black/5 dark:bg-black/40 flex items-center justify-center relative hover:scale-110 transition-transform cursor-pointer border border-stone-200 dark:border-stone-700 shadow-sm"
          title="View Planet"
        >
          <PixelPlanet type="earth" seed={seed} />
        </button>
      </td>
      <td className="py-2 px-3">
        <Link
          href={`/worlds/${world.id}`}
          className="font-medium text-stone-900 dark:text-stone-100 hover:text-primary transition-colors block"
        >
          {world.label || "Untitled World"}
        </Link>
      </td>
      <td className="hidden md:table-cell py-2 px-3">
        <span className="font-mono text-xs text-stone-500 dark:text-stone-500">
          {world.id}
        </span>
      </td>
      <td className="hidden md:table-cell py-2 px-3">
        <span className="text-sm text-stone-600 dark:text-stone-400">
          {new Date(world.updatedAt).toLocaleDateString()}
        </span>
      </td>
      <td className="py-2 px-3 text-right">
        <Link
          href={`/worlds/${world.id}`}
          className="text-primary hover:text-primary-dark dark:hover:text-primary-light text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Manage &rarr;
        </Link>
      </td>
    </tr>
  );
}
