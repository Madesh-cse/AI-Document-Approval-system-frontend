"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getAuditLogs, AuditLog } from "@/services/auditLogService";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
type StatusFilter = "all" | "success" | "failed";

type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_FILTERS: {
  value: StatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

function LineIcon({
  children,
  className = "h-4 w-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "?";
}

function getStatusStyles(status: string) {
  switch (status.toLowerCase()) {
    case "success":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };

    case "failed":
      return {
        badge: "border-red-200 bg-red-50 text-red-700",
        dot: "bg-red-500",
      };

    default:
      return {
        badge: "border-slate-200 bg-slate-50 text-slate-600",
        dot: "bg-slate-400",
      };
  }
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function StatCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAuditLogs();

      setLogs(response.logs);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, actionFilter, pageSize]);

  const stats = useMemo(() => {
    const success = logs.filter(
      (log) => log.status.toLowerCase() === "success",
    ).length;

    const failed = logs.filter(
      (log) => log.status.toLowerCase() === "failed",
    ).length;

    const users = new Set(logs.map((log) => log.user)).size;

    const rate = logs.length
      ? Math.round((success / logs.length) * 100)
      : 0;

    const latest = logs.reduce<string | null>((current, log) => {
      if (!current) return log.timestamp;

      return new Date(log.timestamp) > new Date(current)
        ? log.timestamp
        : current;
    }, null);

    return {
      total: logs.length,
      success,
      failed,
      users,
      rate,
      latest,
    };
  }, [logs]);

  const actionOptions = useMemo(
    () =>
      Array.from(
        new Set(logs.map((log) => log.action)),
      ).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    const filtered = logs.filter((log) => {
      const matchesSearch =
        !searchValue ||
        log.user.toLowerCase().includes(searchValue) ||
        log.action.toLowerCase().includes(searchValue) ||
        log.document?.toLowerCase().includes(searchValue) ||
        log.status.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        log.status.toLowerCase() === statusFilter;

      const matchesAction =
        actionFilter === "all" ||
        log.action === actionFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAction
      );
    });

    return filtered.sort((a, b) => {
      const difference =
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime();

      return sortDirection === "asc"
        ? difference
        : -difference;
    });
  }, [
    logs,
    search,
    statusFilter,
    actionFilter,
    sortDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / pageSize),
  );

  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * pageSize;

  const pageLogs = filteredLogs.slice(
    startIndex,
    startIndex + pageSize,
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    actionFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setActionFilter("all");
  };

  const exportCsv = () => {
    const header = [
      "Timestamp",
      "User",
      "Action",
      "Document",
      "Status",
    ];

    const rows = filteredLogs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.user,
      log.action,
      log.document ?? "",
      log.status,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map(escapeCsv).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `audit-logs-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main application area */}
      <div className="lg:pl-62.5">
        {/* Header */}
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  Audit Logs
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Track document activity and workflow events.
                  {stats.latest && (
                    <span className="ml-1 text-slate-400">
                      Last event{" "}
                      {formatTimestamp(stats.latest)}.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadAuditLogs}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LineIcon
                    className={`h-4 w-4 ${
                      loading ? "animate-spin" : ""
                    }`}
                  >
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <path d="M21 4v5h-5" />
                  </LineIcon>

                  Refresh
                </button>

                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={
                    loading ||
                    filteredLogs.length === 0
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <LineIcon>
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </LineIcon>

                  Export CSV
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total events"
                value={loading ? "-" : stats.total}
                hint="All recorded activity"
                tone="bg-blue-50 text-blue-600"
                icon={
                  <LineIcon>
                    <path d="M4 6h16M4 12h16M4 18h10" />
                  </LineIcon>
                }
              />

              <StatCard
                label="Successful"
                value={loading ? "-" : stats.success}
                hint={
                  loading
                    ? "Calculating..."
                    : `${stats.rate}% success rate`
                }
                tone="bg-emerald-50 text-emerald-600"
                icon={
                  <LineIcon>
                    <circle cx="12" cy="12" r="9" />
                    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
                  </LineIcon>
                }
              />

              <StatCard
                label="Failed"
                value={loading ? "-" : stats.failed}
                hint="Events needing attention"
                tone="bg-red-50 text-red-600"
                icon={
                  <LineIcon>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16.5v.01" />
                  </LineIcon>
                }
              />

              <StatCard
                label="Active users"
                value={loading ? "-" : stats.users}
                hint="Unique users in the log"
                tone="bg-slate-100 text-slate-600"
                icon={
                  <LineIcon>
                    <circle cx="9" cy="8" r="3.5" />
                    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
                  </LineIcon>
                }
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={loadAuditLogs}
                  className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Table Card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                <div className="relative min-w-60 flex-1">
                  <LineIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </LineIcon>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search by user, action, document or status..."
                    aria-label="Search audit logs"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div
                  className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
                  role="group"
                  aria-label="Filter by status"
                >
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() =>
                        setStatusFilter(filter.value)
                      }
                      aria-pressed={
                        statusFilter === filter.value
                      }
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        statusFilter === filter.value
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <select
                  value={actionFilter}
                  onChange={(event) =>
                    setActionFilter(event.target.value)
                  }
                  aria-label="Filter by action"
                  className="rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">
                    All actions
                  </option>

                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-225">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th
                        scope="col"
                        aria-sort={
                          sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                        }
                        className="px-6 py-3.5 text-left"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSortDirection((current) =>
                              current === "asc"
                                ? "desc"
                                : "asc",
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
                        >
                          Timestamp

                          <LineIcon
                            className={`h-3.5 w-3.5 transition-transform ${
                              sortDirection === "asc"
                                ? "rotate-180"
                                : ""
                            }`}
                          >
                            <path d="M12 5v14" />
                            <path d="m6 13 6 6 6-6" />
                          </LineIcon>
                        </button>
                      </th>

                      {[
                        "User",
                        "Action",
                        "Document",
                        "Status",
                      ].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 6 }).map(
                        (_, index) => (
                          <tr
                            key={index}
                            className="animate-pulse"
                          >
                            <td className="px-6 py-4">
                              <div className="h-3 w-32 rounded bg-slate-100" />
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-100" />
                                <div className="h-3 w-24 rounded bg-slate-100" />
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="h-3 w-28 rounded bg-slate-100" />
                            </td>

                            <td className="px-6 py-4">
                              <div className="h-3 w-40 rounded bg-slate-100" />
                            </td>

                            <td className="px-6 py-4">
                              <div className="h-5 w-16 rounded-full bg-slate-100" />
                            </td>
                          </tr>
                        ),
                      )
                    ) : pageLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-16 text-center"
                        >
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <LineIcon className="h-5 w-5">
                              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                              <path d="M14 3v5h5" />
                            </LineIcon>
                          </div>

                          <p className="mt-3 text-sm font-medium text-slate-600">
                            {hasActiveFilters
                              ? "No audit logs match your filters"
                              : "No audit logs found"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {hasActiveFilters
                              ? "Try a different search or clear the filters."
                              : "Activity will appear here as documents are processed."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      pageLogs.map((log) => {
                        const styles = getStatusStyles(
                          log.status,
                        );

                        return (
                          <tr
                            key={log.id}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                              {formatTimestamp(
                                log.timestamp,
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                                  {getInitials(log.user)}
                                </div>

                                <span className="whitespace-nowrap text-sm font-medium text-slate-800">
                                  {log.user}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {log.action}
                              </span>
                            </td>

                            <td className="max-w-70 px-6 py-4">
                              {log.document ? (
                                <span
                                  className="flex items-center gap-2 text-sm text-slate-700"
                                  title={log.document}
                                >
                                  <LineIcon className="h-4 w-4 shrink-0 text-slate-400">
                                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 3v5h5" />
                                  </LineIcon>

                                  <span className="truncate">
                                    {log.document}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  -
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles.badge}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
                                />

                                {log.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              {!loading && filteredLogs.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-3.5">
                  <p className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-medium text-slate-900">
                      {startIndex + 1}-
                      {startIndex + pageLogs.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-slate-900">
                      {filteredLogs.length}
                    </span>{" "}
                    {filteredLogs.length === 1
                      ? "event"
                      : "events"}
                  </p>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      Rows per page

                      <select
                        value={pageSize}
                        onChange={(event) =>
                          setPageSize(
                            Number(event.target.value),
                          )
                        }
                        className="rounded-md border border-slate-300 bg-white py-1 pl-2 pr-6 text-xs text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPage(currentPage - 1)
                        }
                        disabled={currentPage <= 1}
                        aria-label="Previous page"
                        className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <LineIcon>
                          <path d="m15 6-6 6 6 6" />
                        </LineIcon>
                      </button>

                      <span className="px-2 text-xs text-slate-500">
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setPage(currentPage + 1)
                        }
                        disabled={
                          currentPage >= totalPages
                        }
                        aria-label="Next page"
                        className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <LineIcon>
                          <path d="m9 6 6 6-6 6" />
                        </LineIcon>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}