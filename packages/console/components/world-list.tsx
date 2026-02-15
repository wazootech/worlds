"use client";

import { startTransition } from "react";
import { World } from "@wazoo/sdk";
import { ResourceTable, Column } from "./resource-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { useRouter } from "next/navigation";
import { PixelPlanet } from "./pixel-planet/pixel-planet";
import { getSeedFromId } from "./pixel-planet/lib/seed-utils";
import Link from "next/link";

export function WorldList({
  organizationId,
  initialData,
  initialPageSize,
  initialPage,
}: {
  organizationId: string;
  initialData: World[];
  initialPageSize: number;
  initialPage: number;
}) {
  const router = useRouter();
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(initialPage).withOptions({ shallow: false }),
  );
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(initialPageSize).withOptions({ shallow: false }),
  );

  const handlePlanetClick = (
    e: React.MouseEvent,
    worldId: string,
    slug?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const worldSlug = slug || worldId;
    const targetUrl = `/organizations/${organizationId}/worlds/${worldSlug}?lounge=true`;

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

  const columns: Column<World>[] = [
    {
      key: "planet",
      label: "",
      className: "w-[48px]",
      render: (world) => {
        const seed = getSeedFromId(world.id);
        return (
          <button
            onClick={(e) =>
              handlePlanetClick(
                e,
                world.id,
                (world as World & { slug?: string }).slug,
              )
            }
            className="h-8 w-8 overflow-hidden rounded-full bg-black/5 dark:bg-black/40 flex items-center justify-center relative hover:scale-110 transition-transform cursor-pointer border border-stone-200 dark:border-stone-700 shadow-sm"
            title="View Planet"
          >
            <PixelPlanet type="earth" seed={seed} />
          </button>
        );
      },
    },
    {
      key: "label",
      label: "World Name",
      render: (world) => (
        <Link
          href={`/organizations/${organizationId}/worlds/${(world as World & { slug?: string }).slug || world.id}`}
          className="font-medium text-stone-900 dark:text-stone-100 hover:text-primary transition-colors block"
        >
          {world.label || "Untitled World"}
        </Link>
      ),
    },
    {
      key: "id",
      label: "ID",
      className: "hidden md:table-cell",
      render: (world) => (
        <span className="font-mono text-xs text-stone-500 dark:text-stone-500">
          {world.id}
        </span>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      className: "hidden md:table-cell",
      render: (world) => (
        <span className="text-sm text-stone-600 dark:text-stone-400">
          {new Date(world.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (world) => (
        <Link
          href={`/organizations/${organizationId}/worlds/${(world as World & { slug?: string }).slug || world.id}`}
          className="text-primary hover:text-primary-dark dark:hover:text-primary-light text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Manage &rarr;
        </Link>
      ),
    },
  ];

  return (
    <ResourceTable
      columns={columns}
      data={initialData}
      onRowClick={(world) =>
        router.push(
          `/organizations/${organizationId}/worlds/${(world as World & { slug?: string }).slug || world.id}`,
        )
      }
      pagination={{
        currentPage: page,
        pageSize: pageSize,
        hasMore: initialData.length === pageSize,
        onPageChange: (p) => setPage(p),
        onPageSizeChange: (s) => {
          setPageSize(s);
          setPage(1);
        },
      }}
      emptyState={
        <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-12 text-center bg-stone-50/50 dark:bg-stone-900/50">
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            No worlds yet
          </h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Get started by creating your first world.
          </p>
        </div>
      }
    />
  );
}
