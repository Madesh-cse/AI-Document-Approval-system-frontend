"use client";

import { ReactNode, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";

import {
  getDocuments,
  type DocumentItem,
  type DocumentCategory,
  type DocumentStatus,
} from "@/services/documentService";

// ── Config ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// Where the "Review" button goes
const reviewPath = (id: number | string) => `/documentList/${id}`;

// ── Icons (inline SVG, self-contained) ────────────────────────────────────
const ICONS: Record<string, ReactNode> = {
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8M16 13H8M16 17H8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  check_circle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  x_circle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
  loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  shield_check: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  shield_alert: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  chevron_left: <path d="m15 18-6-6 6-6" />,
  chevron_right: <path d="m9 18 6-6-6-6" />,
  sort: (
    <>
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bdc]";

// ── Data helpers ──────────────────────────────────────────────────────────
function formatCategory(category: DocumentCategory | null) {
  if (!category) {
    return "—";
  }

  const labels: Record<DocumentCategory, string> = {
    invoice: "Invoice",
    insurance_policy: "Insurance",
    purchase_order: "Purchase Order",
    expense_report: "Expense Report",
    financial_statement: "Financial Statement",
    contract: "Contract",
    unsupported: "Unsupported",
  };

  return labels[category] ?? category;
}

function formatDate(date: string) {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDocumentIdentifier(doc: DocumentItem) {
  const data = doc.extracted_data;

  if (!data) {
    return null;
  }

  const identifier =
    data.invoice_number ??
    data.policy_number ??
    data.purchase_order_number ??
    data.report_number ??
    data.contract_number;

  if (typeof identifier === "string" && identifier.trim()) {
    return identifier;
  }

  return null;
}

function getDocumentTitle(doc: DocumentItem) {
  return getDocumentIdentifier(doc) || doc.title || doc.file_name;
}

function getDocumentAmount(doc: DocumentItem) {
  const data = doc.extracted_data;

  if (!data) {
    return null;
  }

  switch (doc.document_category) {
    case "invoice":
    case "purchase_order":
      return { amount: data.total_amount, currency: data.currency };

    case "expense_report":
      return { amount: data.reimbursable_amount, currency: data.currency };

    case "insurance_policy":
      return { amount: data.premium, currency: data.currency };

    case "financial_statement":
      return { amount: data.net_income, currency: data.currency };

    case "contract":
      return { amount: data.contract_value, currency: data.currency };

    default:
      return null;
  }
}

function formatAmount(amount: unknown, currency: unknown) {
  if (typeof amount !== "number") {
    return "—";
  }

  const code =
    typeof currency === "string" && currency.trim()
      ? currency.trim().toUpperCase()
      : null;

  if (!code) {
    return amount.toLocaleString("en-IN");
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "INR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString("en-IN")}`;
  }
}

function getUploadedBy(doc: DocumentItem) {
  return `User #${doc.uploaded_by}`;
}

const timeValue = (value: string) => {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
};

// ── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "all", label: "All documents", match: () => true },
  {
    id: "pending",
    label: "Pending approval",
    match: (doc: DocumentItem) => doc.status === "pending_review",
  },
  {
    id: "invoices",
    label: "Invoices",
    match: (doc: DocumentItem) => doc.document_category === "invoice",
  },
  {
    id: "contracts",
    label: "Contracts",
    match: (doc: DocumentItem) => doc.document_category === "contract",
  },
  {
    id: "processing",
    label: "Processing",
    match: (doc: DocumentItem) => doc.status === "processing",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Badges ────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  approved: {
    label: "Approved",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  pending_review: {
    label: "Pending Approval",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
  processing: {
    label: "Processing",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500 animate-pulse motion-reduce:animate-none",
  },
  draft: {
    label: "Draft",
    badge: "bg-slate-50 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
};

function StatusBadge({ status }: { status: DocumentStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function ValidationBadge({ passed }: { passed: boolean | null }) {
  if (passed === true) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <Icon name="shield_check" className="h-3.5 w-3.5" />
        Passed
      </span>
    );
  }

  if (passed === false) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
        <Icon name="shield_alert" className="h-3.5 w-3.5" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
      <Icon name="clock" className="h-3.5 w-3.5" />
      Not evaluated
    </span>
  );
}

// ── Layout pieces ─────────────────────────────────────────────────────────
function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/70 motion-reduce:animate-none ${className}`}
    />
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>

        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}
        >
          <Icon name={icon} className="h-4.5 w-4.5" />
        </span>
      </div>

      <p className="mt-2 text-[28px] font-semibold leading-9 tracking-tight tabular-nums text-slate-900">
        {new Intl.NumberFormat("en-IN").format(value)}
      </p>

      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading documents">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <Bone className="h-3.5 w-28" />
            <Bone className="mt-4 h-8 w-20" />
            <Bone className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex gap-6 border-b border-slate-200 px-5 py-4">
          {[0, 1, 2, 3].map((item) => (
            <Bone key={item} className="h-4 w-24" />
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-6 px-5 py-4">
              <div className="flex-1">
                <Bone className="h-4 w-40" />
                <Bone className="mt-2 h-3 w-56" />
              </div>
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-24" />
              <Bone className="h-6 w-20 rounded-full" />
              <Bone className="h-6 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } =
    useQuery({
      queryKey: ["documents"],
      queryFn: getDocuments,
    });

  const documents = useMemo(() => data?.documents ?? [], [data]);

  // Numbers for the summary cards
  const stats = useMemo(
    () => ({
      total: documents.length,
      pending: documents.filter((doc) => doc.status === "pending_review")
        .length,
      approved: documents.filter((doc) => doc.status === "approved").length,
      failed: documents.filter((doc) => doc.guardrail_passed === false).length,
    }),
    [documents],
  );

  // Count shown on every tab
  const tabCounts = useMemo(() => {
    const counts = {} as Record<TabId, number>;

    TABS.forEach((tab) => {
      counts[tab.id] = documents.filter(tab.match).length;
    });

    return counts;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const tab = TABS.find((item) => item.id === activeTab) ?? TABS[0];
    const term = search.trim().toLowerCase();

    const matches = documents.filter((doc) => {
      if (!tab.match(doc)) return false;

      if (!term) return true;

      return [
        getDocumentTitle(doc),
        doc.file_name,
        formatCategory(doc.document_category),
        getUploadedBy(doc),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    return matches.sort((a, b) =>
      newestFirst
        ? timeValue(b.created_at) - timeValue(a.created_at)
        : timeValue(a.created_at) - timeValue(b.created_at),
    );
  }, [documents, activeTab, search, newestFirst]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const pageDocuments = filteredDocuments.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const hasFilters = activeTab !== "all" || search.trim() !== "";

  const clearFilters = () => {
    setActiveTab("all");
    setSearch("");
    setPage(1);
  };

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main application */}
      <div className="lg:pl-62.5">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            {/* Page heading */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <nav
                  aria-label="Breadcrumb"
                  className="text-xs font-medium text-slate-400"
                >
                  Workspace
                  <span className="mx-1.5">/</span>
                  <span className="text-slate-600">Documents</span>
                </nav>

                <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight text-slate-900">
                  Documents
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Every document ingested by DocIntel AI, with extraction and
                  validation results.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="hidden text-xs text-slate-400 md:inline">
                    Updated {lastUpdated}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                >
                  <Icon
                    name="refresh"
                    className={`h-4 w-4 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-lg bg-[#315bdc] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#274dc4] ${focusRing}`}
                >
                  <Icon name="upload" />
                  Upload Document
                </button>
              </div>
            </div>

            {/* Loading */}
            {isLoading && <LoadingState />}

            {/* Error */}
            {isError && (
              <div
                role="alert"
                className="mx-auto mt-10 max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-4 ring-red-50/60">
                  <Icon name="alert" className="h-6 w-6" />
                </span>

                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                  Failed to load documents
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Something went wrong while fetching your documents. Please try
                  again.
                </p>

                <button
                  type="button"
                  onClick={() => refetch()}
                  className={`mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 ${focusRing}`}
                >
                  <Icon name="refresh" />
                  Try Again
                </button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    label="Total documents"
                    value={stats.total}
                    hint="Across all categories"
                    icon="file"
                    tone="bg-blue-50 text-[#315bdc]"
                  />

                  <KpiCard
                    label="Pending approval"
                    value={stats.pending}
                    hint="Awaiting reviewer action"
                    icon="clock"
                    tone="bg-amber-50 text-amber-600"
                  />

                  <KpiCard
                    label="Approved"
                    value={stats.approved}
                    hint="Cleared for payment"
                    icon="check_circle"
                    tone="bg-emerald-50 text-emerald-600"
                  />

                  <KpiCard
                    label="Validation failed"
                    value={stats.failed}
                    hint="Needs attention"
                    icon="shield_alert"
                    tone="bg-red-50 text-red-600"
                  />
                </div>

                {/* Document table */}
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  {/* Tabs */}
                  <div
                    role="tablist"
                    aria-label="Document filters"
                    className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3"
                  >
                    {TABS.map((tab) => {
                      const active = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setPage(1);
                          }}
                          className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition ${focusRing} ${
                            active
                              ? "border-[#315bdc] text-[#315bdc]"
                              : "border-transparent text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}

                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                              active
                                ? "bg-blue-50 text-[#315bdc]"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {tabCounts[tab.id]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Toolbar */}
                  <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-sm">
                      <Icon
                        name="search"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Search by document, file, type or user..."
                        aria-label="Search documents"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#315bdc] focus:ring-2 focus:ring-[#315bdc]/20"
                      />

                      {search && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setPage(1);
                          }}
                          aria-label="Clear search"
                          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 ${focusRing}`}
                        >
                          <Icon name="x" className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500" aria-live="polite">
                      {filteredDocuments.length === documents.length
                        ? `${documents.length} ${documents.length === 1 ? "document" : "documents"}`
                        : `${filteredDocuments.length} of ${documents.length} documents`}
                    </p>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-240 border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Document
                          </th>

                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Type
                          </th>

                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Uploaded By
                          </th>

                          <th
                            className="px-4 py-3 text-left"
                            aria-sort={newestFirst ? "descending" : "ascending"}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setNewestFirst((value) => !value);
                                setPage(1);
                              }}
                              className={`inline-flex items-center gap-1 rounded text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 ${focusRing}`}
                            >
                              Date
                              <Icon name="sort" className="h-3 w-3" />
                            </button>
                          </th>

                          <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Amount
                          </th>

                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            AI Validation
                          </th>

                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Status
                          </th>

                          <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {pageDocuments.map((doc) => {
                          const amountInfo = getDocumentAmount(doc);
                          const identifier = getDocumentIdentifier(doc);

                          return (
                            <tr
                              key={doc.id}
                              className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/70"
                            >
                              {/* Document */}
                              <td className="px-5 py-3.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(reviewPath(doc.id))
                                  }
                                  className={`block rounded text-left ${focusRing}`}
                                >
                                  <span
                                    className={`block text-sm font-semibold text-slate-900 hover:text-[#315bdc] ${identifier ? "font-mono" : ""}`}
                                  >
                                    {getDocumentTitle(doc)}
                                  </span>
                                </button>

                                <p className="mt-0.5 flex max-w-70 items-center gap-1.5 truncate text-xs text-slate-400">
                                  <Icon name="file" className="h-3 w-3" />
                                  <span className="truncate">
                                    {doc.file_name}
                                  </span>
                                </p>
                              </td>

                              {/* Type */}
                              <td className="px-4 py-3.5">
                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                  {formatCategory(doc.document_category)}
                                </span>
                              </td>

                              {/* Uploaded By */}
                              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
                                {getUploadedBy(doc)}
                              </td>

                              {/* Date */}
                              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
                                {formatDate(doc.created_at)}
                              </td>

                              {/* Amount */}
                              <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                                {amountInfo
                                  ? formatAmount(
                                      amountInfo.amount,
                                      amountInfo.currency,
                                    )
                                  : "—"}
                              </td>

                              {/* AI Validation */}
                              <td className="px-4 py-3.5">
                                <ValidationBadge
                                  passed={doc.guardrail_passed}
                                />
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3.5">
                                <StatusBadge status={doc.status} />
                              </td>

                              {/* Actions */}
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(reviewPath(doc.id))
                                  }
                                  className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#315bdc] hover:text-[#315bdc] ${focusRing}`}
                                >
                                  <Icon name="eye" className="h-3.5 w-3.5" />
                                  Review
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Empty */}
                    {filteredDocuments.length === 0 && (
                      <div className="px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <Icon name="file" className="h-6 w-6" />
                        </div>

                        <p className="text-sm font-semibold text-slate-700">
                          {documents.length === 0
                            ? "No documents yet"
                            : "No matching documents"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {documents.length === 0
                            ? "Upload your first document to see it here."
                            : "Try a different search or filter."}
                        </p>

                        {hasFilters && documents.length > 0 && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className={`mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${focusRing}`}
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {filteredDocuments.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row">
                      <p className="text-xs text-slate-500">
                        Showing{" "}
                        <span className="font-semibold text-slate-700">
                          {startIndex + 1}–{startIndex + pageDocuments.length}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-slate-700">
                          {filteredDocuments.length}
                        </span>
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage(currentPage - 1)}
                          disabled={currentPage <= 1}
                          aria-label="Previous page"
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                        >
                          <Icon name="chevron_left" />
                        </button>

                        <span className="min-w-22 text-center text-xs font-medium text-slate-600">
                          Page {currentPage} of {totalPages}
                        </span>

                        <button
                          type="button"
                          onClick={() => setPage(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          aria-label="Next page"
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                        >
                          <Icon name="chevron_right" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
