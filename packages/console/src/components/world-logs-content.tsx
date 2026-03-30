"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { format } from "date-fns";
import { useQueryState, parseAsString } from "nuqs";
import {
  Info,
  AlertTriangle,
  XCircle,
  Bug,
  RefreshCw,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { useWorld } from "@/components/world-context";
import { ResourceTable, Column } from "@/components/resource-table";
import { listWorldLogs } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { JSONCodeBlock } from "@/components/json-code-block";
import type { Log } from "@wazoo/worlds-sdk";

function LogDetailDialog({
  log,
  isOpen,
  onClose,
}: {
  log: Log | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);

  if (!log) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const icons = {
    info: <Info className="size-5 text-blue-500" />,
    warn: <AlertTriangle className="size-5 text-amber-500" />,
    error: <XCircle className="size-5 text-red-500" />,
    debug: <Bug className="size-5 text-stone-500" />,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            {icons[log.level as keyof typeof icons] || (
              <Terminal className="size-5 text-stone-500" />
            )}
            <DialogTitle className="capitalize">{log.level} Entry</DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs tabular-nums">
            {format(new Date(log.timestamp), "PPPP 'at' HH:mm:ss.SSS")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 w-full overflow-hidden">
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Event
            </h4>
            <div className="font-mono text-sm whitespace-pre-wrap break-all bg-stone-50 dark:bg-stone-950/50 p-3 rounded-md border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 max-h-[200px] overflow-y-auto">
              {log.message}
            </div>
          </div>

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Metadata
                </h4>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors bg-stone-100 dark:bg-stone-800/50 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700"
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>
              <JSONCodeBlock
                code={JSON.stringify(log.metadata, null, 2)}
                className="w-full"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WorldLogsContent() {
  const { world } = useWorld();
  const [logs, setLogs] = useState<Log[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [level, setLevel] = useQueryState(
    "level",
    parseAsString.withDefault("all"),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const fetchLogs = useCallback(
    async (currentPageSize: number, currentLevel: string) => {
      setLoading(true);
      setError(null);
      try {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        let allLogs: Log[] = [];
        let page = 1;
        let hasMore = true;
        const maxPages = 10; // Safety limit: fetch at most 10 pages (~500 logs)

        while (hasMore && page <= maxPages) {
          const result = await listWorldLogs(
            world.id,
            page,
            currentPageSize,
            currentLevel === "all" ? undefined : currentLevel,
          );

          if (result.success && result.logs) {
            const fetchedLogs = result.logs as Log[];
            if (fetchedLogs.length === 0) {
              hasMore = false;
              break;
            }

            allLogs = [...allLogs, ...fetchedLogs];

            // Check if the last log in the batch is older than 24 hours
            const lastLogTimestamp =
              fetchedLogs[fetchedLogs.length - 1].timestamp;
            if (lastLogTimestamp < twentyFourHoursAgo) {
              hasMore = false;
            }

            page++;

            // If we got fewer logs than requested, there are no more
            if (fetchedLogs.length < currentPageSize) {
              hasMore = false;
            }
          } else {
            setError(result.error || "Failed to fetch logs");
            hasMore = false;
          }
        }

        // Filter to ensure all logs are within the 24-hour window
        const filteredLogs = allLogs.filter(
          (log) => log.timestamp >= twentyFourHoursAgo,
        );
        setLogs(filteredLogs);
      } catch (err) {
        setError("An unexpected error occurred while fetching logs");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [world.id],
  );

  useEffect(() => {
    fetchLogs(pageSize, level);
  }, [fetchLogs, pageSize, level]);

  const handleRefresh = () => {
    startRefresh(() => {
      fetchLogs(pageSize, level);
    });
  };

  const columns: Column<Log>[] = [
    {
      key: "level",
      label: "Level",
      className: "w-24",
      render: (log: Log) => {
        const icons = {
          info: <Info className="size-4 text-blue-500" />,
          warn: <AlertTriangle className="size-4 text-amber-500" />,
          error: <XCircle className="size-4 text-red-500" />,
          debug: <Bug className="size-4 text-stone-500" />,
        };
        return (
          <div className="flex items-center gap-2">
            {icons[log.level as keyof typeof icons] || (
              <Terminal className="size-4 text-stone-500" />
            )}
            <span className="capitalize text-xs font-medium">{log.level}</span>
          </div>
        );
      },
    },
    {
      key: "message",
      label: "Event",
      className: "w-48",
      render: (log: Log) => (
        <div className="max-w-[192px]">
          <p className="font-mono text-xs break-all line-clamp-1 opacity-90">
            {log.message}
          </p>
        </div>
      ),
    },
    {
      key: "metadata",
      label: "Metadata",
      render: (log: Log) => {
        const stringifiedMetadata = log.metadata
          ? JSON.stringify(log.metadata)
          : "-";
        return (
          <div className="max-w-xl">
            <p
              className="font-mono text-[11px] break-all line-clamp-1 opacity-60"
              title={stringifiedMetadata}
            >
              {stringifiedMetadata}
            </p>
          </div>
        );
      },
    },
    {
      key: "timestamp",
      label: "Timestamp",
      className: "w-48 text-right",
      render: (log: Log) => (
        <span className="text-xs text-stone-500 tabular-nums">
          {format(new Date(log.timestamp), "MMM d, HH:mm:ss.SSS")}
        </span>
      ),
    },
  ];

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
                Logs
              </h1>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Recent activity and system events for this world from the last 24
              hours.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label
                htmlFor="level-filter"
                className="text-sm font-medium text-stone-600 dark:text-stone-400"
              >
                Level:
              </label>
              <select
                id="level-filter"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 transition-colors"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`size-4 ${loading || isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start gap-3">
            <XCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Error Loading Logs
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
              <button
                onClick={() => fetchLogs(pageSize, level)}
                className="text-sm font-semibold text-red-800 dark:text-red-200 underline mt-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <ResourceTable
          columns={columns}
          data={logs}
          loading={loading}
          condensed={true}
          onRowClick={(log: Log) => setSelectedLog(log)}
          emptyState={
            <div className="p-12 text-center">
              <Terminal className="size-12 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-900 dark:text-white">
                No logs found
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 text-balance">
                Activities like searching, querying, or updating your world will
                appear here.
              </p>
            </div>
          }
          pagination={{
            pageSize: pageSize,
            hasMore: false,
            onPageChange: () => {},
            onPageSizeChange: (size: number) => setPageSize(size),
          }}
        />

        <LogDetailDialog
          log={selectedLog}
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      </div>
    </main>
  );
}
