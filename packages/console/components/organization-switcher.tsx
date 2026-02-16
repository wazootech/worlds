"use client";

import { useEffect, useState, useTransition, Fragment } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, Plus, Users, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResourceBreadcrumb {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  menuItems?: ResourceMenuItem[];
  resourceType?: string;
  createHref?: string;
}
import { listOrganizations } from "@/app/actions";
import type { Organization } from "@wazoo/sdk";

export interface ResourceMenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export function OrganizationSwitcher({
  resource,
}: {
  resource?: ResourceBreadcrumb | ResourceBreadcrumb[];
}) {
  const { organization: organizationId } = useParams() as {
    organization?: string;
  };
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const resources = Array.isArray(resource)
    ? resource
    : resource
      ? [resource]
      : [];

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const orgs = await listOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error("Failed to load organizations:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrganizations();
  }, []);

  const currentOrg = organizations.find(
    (o) =>
      o.id === organizationId ||
      (o as Organization & { slug?: string }).slug === organizationId,
  );

  const handleSelect = (idOrSlug: string) => {
    startTransition(() => {
      router.push(`/organizations/${idOrSlug}`);
    });
  };

  const handleCreateNew = () => {
    startTransition(() => {
      router.push("/?new=true");
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-stone-300 dark:text-stone-700 font-light text-xl select-none">
        /
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={isLoading || isPending}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all focus:outline-none group text-left",
              isPending && "opacity-70 cursor-not-allowed",
            )}
          >
            <div className="flex items-center justify-center w-5 h-5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
              <Users className="w-3 h-3 text-stone-500" />
            </div>

            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate max-w-[120px]">
              {isLoading ? "Loading..." : currentOrg?.label || "Select Org"}
            </span>

            <div className="flex flex-col ml-1 shrink-0">
              <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-colors" />
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-stone-500 px-2 py-1.5">
            Current Organization
          </DropdownMenuLabel>

          {currentOrg && (
            <DropdownMenuItem
              className="flex items-center justify-between group"
              onClick={() =>
                handleSelect(
                  (currentOrg as Organization & { slug?: string }).slug ||
                    currentOrg.id,
                )
              }
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-400" />
                <span className="font-medium">{currentOrg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-500">
                  Free
                </span>
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-stone-500 px-2 py-1.5">
            Other Organizations
          </DropdownMenuLabel>

          <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
            {organizations
              .filter((o) => o.id !== currentOrg?.id)
              .map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() =>
                    handleSelect(
                      (org as Organization & { slug?: string }).slug || org.id,
                    )
                  }
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200" />
                    <span className="text-stone-700 dark:text-stone-300 group-hover:text-stone-950 dark:group-hover:text-stone-50 transition-colors">
                      {org.label}
                    </span>
                  </div>
                  <span className="text-[10px] bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Classic
                  </span>
                </DropdownMenuItem>
              ))}

            {organizations.filter((o) => o.id !== currentOrg?.id).length ===
              0 && (
              <div className="px-2 py-4 text-center text-xs text-stone-500">
                No other organizations found
              </div>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleCreateNew}
            className="text-primary focus:text-primary-dark"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Create New Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {resources.map((res, index) => {
        // We can make this generic, but for now specific styling/logic for Worlds might be nice.
        // Actually, let's keep it generic based on availability of `resourceType`.

        return (
          <Fragment key={`${res.href || "no-href"}-${index}`}>
            <div className="text-stone-300 dark:text-stone-700 font-light text-xl select-none">
              /
            </div>

            {res.menuItems ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all focus:outline-none group text-left">
                    <div className="flex items-center justify-center w-5 h-5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
                      {res.icon || (
                        <LayoutGrid className="w-3 h-3 text-stone-500" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate max-w-[150px]">
                      {res.label}
                    </span>
                    <div className="flex flex-col ml-0.5 shrink-0">
                      <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-colors" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {res.resourceType && (
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-stone-500 px-2 py-1.5">
                      Current {res.resourceType}
                    </DropdownMenuLabel>
                  )}

                  {/* Current Item (Generic or using passed label) */}
                  <DropdownMenuItem
                    className="flex items-center justify-between group"
                    onClick={() => res.href && router.push(res.href)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 flex items-center justify-center">
                        {res.icon || (
                          <LayoutGrid className="w-3 h-3 text-stone-500" />
                        )}
                      </div>
                      <span className="font-medium">{res.label}</span>
                    </div>
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </DropdownMenuItem>

                  {res.resourceType && <DropdownMenuSeparator />}

                  {res.resourceType && (
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-stone-500 px-2 py-1.5">
                      Other {res.resourceType}s
                    </DropdownMenuLabel>
                  )}

                  <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
                    {res.menuItems
                      .filter((item) => item.label !== res.label) // Exclude current
                      .map((item) => (
                        <DropdownMenuItem
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          className="flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 flex items-center justify-center">
                              {item.icon}
                            </div>
                            <span className="text-stone-700 dark:text-stone-300 group-hover:text-stone-950 dark:group-hover:text-stone-50 transition-colors">
                              {item.label}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}

                    {res.menuItems.filter((item) => item.label !== res.label)
                      .length === 0 &&
                      res.resourceType && (
                        <div className="px-2 py-4 text-center text-xs text-stone-500">
                          No other {res.resourceType.toLowerCase()}s found
                        </div>
                      )}
                  </DropdownMenuGroup>

                  {(res.createHref || res.resourceType) && (
                    <DropdownMenuSeparator />
                  )}

                  {res.createHref && (
                    <DropdownMenuItem
                      onClick={() => router.push(res.createHref!)}
                      className="text-primary focus:text-primary-dark"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span>Create New {res.resourceType || "Item"}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href={res.href || "#"}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-all font-semibold text-sm text-stone-900 dark:text-stone-100"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
                  {res.icon || (
                    <LayoutGrid className="w-3 h-3 text-stone-500" />
                  )}
                </div>
                {res.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
