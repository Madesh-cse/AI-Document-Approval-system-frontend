"use client";

import { isAxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import {
  approveDocument,
  getDocument,
  rejectDocument,
} from "@/services/documentService";
import { useAuthStore } from "@/store/authStore";

/* -------------------------------------------------------------------------- */
/* Error + formatting helpers                                                 */
/* -------------------------------------------------------------------------- */

function getErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the server. Check your connection and try again.";
    }

    const detail = error.response.data?.detail;

    if (typeof detail === "string" && detail) return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  }

  return fallback;
}

const titleCase = (value: string) =>
  value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatCategory = (category?: string | null) =>
  category ? titleCase(category) : "—";

const formatStatus = (status: string) => titleCase(status);

const formatLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return value || "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(size?: number | null) {
  if (typeof size !== "number" || !Number.isFinite(size)) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAmount(value: number, currency?: unknown) {
  const currencyCode =
    typeof currency === "string" && currency.length > 0 ? currency : "INR";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toLocaleString("en-IN")}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Deadline helpers                                                           */
/* -------------------------------------------------------------------------- */

function formatTimeRemaining(milliseconds: number) {
  if (milliseconds <= 0) return "Deadline passed";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

type Countdown = {
  valid: boolean;
  overdue: boolean;
  urgent: boolean;
  remaining: number;
  label: string;
};

function useDeadlineCountdown(deadline?: string | null): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const deadlineTime = deadline ? new Date(deadline).getTime() : NaN;

  if (!deadline || Number.isNaN(deadlineTime)) {
    return {
      valid: false,
      overdue: false,
      urgent: false,
      remaining: 0,
      label: "No deadline",
    };
  }

  const remaining = deadlineTime - now;

  return {
    valid: true,
    overdue: remaining <= 0,
    urgent: remaining > 0 && remaining <= 6 * 60 * 60 * 1000,
    remaining,
    label: formatTimeRemaining(remaining),
  };
}

/* -------------------------------------------------------------------------- */
/* Amount / date field detection                                              */
/* -------------------------------------------------------------------------- */

const AMOUNT_KEYS = new Set([
  "subtotal",
  "tax_amount",
  "total_amount",
  "premium",
  "deductible",
  "coverage_limit",
  "contract_value",
  "total_revenue",
  "total_expenses",
  "operating_income",
  "net_income",
  "total_assets",
  "total_liabilities",
  "total_equity",
  "reimbursable_amount",
  "amount",
  "unit_price",
  "line_total",
  "price",
  "total",
]);

const isAmountKey = (key: string) =>
  AMOUNT_KEYS.has(key) || key.endsWith("_amount");

const isDateKey = (key: string) => key === "date" || key.endsWith("_date");

/* -------------------------------------------------------------------------- */
/* Types + data hook                                                          */
/* -------------------------------------------------------------------------- */

type DocumentDetail = Awaited<ReturnType<typeof getDocument>>;
type ReviewDecision = "approve" | "reject";

const documentKeys = {
  list: ["documents"] as const,
  detail: (id: number) => ["document", id] as const,
};

const PROCESSING_POLL_MS = 5000;

function useDocumentReview(
  documentId: number,
  userRole: "admin" | "manager" | "employee" | undefined,
) {
  const queryClient = useQueryClient();
  const isValidId = Number.isInteger(documentId) && documentId > 0;

  const documentQuery = useQuery({
    queryKey: documentKeys.detail(documentId),
    queryFn: () => getDocument(documentId),
    enabled: isValidId,
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? PROCESSING_POLL_MS : false,
    retry: (failureCount, error) => {
      const status = getErrorStatus(error);
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });

  const decide = useMutation({
    mutationFn: ({
      decision,
      reason,
    }: {
      decision: ReviewDecision;
      reason?: string;
    }) =>
      decision === "approve"
        ? approveDocument(documentId)
        : rejectDocument(documentId, reason ?? ""),

    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(documentKeys.detail(documentId), updatedDocument);
      queryClient.invalidateQueries({ queryKey: documentKeys.list });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const doc = documentQuery.data;

  const canReview =
    (userRole === "admin" || userRole === "manager") &&
    doc?.status === "pending_review" &&
    doc.guardrail_passed === true;

  return {
    isValidId,
    document: doc,
    canReview,
    isLoading: documentQuery.isLoading,
    isError: documentQuery.isError,
    error: documentQuery.error,
    refetch: documentQuery.refetch,
    decide,
  };
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

const ICONS: Record<string, ReactNode> = {
  arrow_left: (
    <>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </>
  ),
  chevron_right: <path d="m9 18 6-6-6-6" />,
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8M16 13H8M16 17H8" />
    </>
  ),
  list: (
    <>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8M13 12h8M13 18h8" />
    </>
  ),
  sparkles: (
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  ),
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
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
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
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74 2.74L3 16" />
      <path d="M8 16H3v5" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
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

/* -------------------------------------------------------------------------- */
/* Primitives                                                                 */
/* -------------------------------------------------------------------------- */

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </header>

      {children}
    </section>
  );
}

/** Label / value row used in wide key-value tables. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-[13px] font-medium text-slate-900">
        {children}
      </dd>
    </div>
  );
}

/** Compact label / value row used in the side rail. */
function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 text-[13px]">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-right font-medium text-slate-900">
        {children}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                     */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  draft: { badge: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  processing: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500 animate-pulse motion-reduce:animate-none",
  },
  pending_review: {
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  approved: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: { badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {formatStatus(status)}
    </span>
  );
}

const CONFIDENCE_LEVELS: Record<
  string,
  { level: number; text: string; bar: string }
> = {
  high: { level: 3, text: "text-emerald-700", bar: "bg-emerald-500" },
  medium: { level: 2, text: "text-amber-700", bar: "bg-amber-500" },
  low: { level: 1, text: "text-red-700", bar: "bg-red-500" },
};

function ConfidenceBadge({ confidence }: { confidence?: string | null }) {
  if (!confidence) {
    return <span className="font-normal text-slate-500">Not available</span>;
  }

  const style = CONFIDENCE_LEVELS[confidence.toLowerCase()];
  const label = confidence.charAt(0).toUpperCase() + confidence.slice(1);

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`${label} confidence`}
      >
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 w-4 rounded-sm ${
              style && segment <= style.level ? style.bar : "bg-slate-200"
            }`}
          />
        ))}
      </span>
      <span className={`font-semibold ${style?.text ?? "text-slate-700"}`}>
        {label}
      </span>
    </span>
  );
}

function ValidationBadge({ passed }: { passed?: boolean | null }) {
  if (passed === true) {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
        <Icon name="shield_check" className="h-4 w-4" />
        Passed
      </span>
    );
  }

  if (passed === false) {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
        <Icon name="shield_alert" className="h-4 w-4" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
      <Icon name="clock" className="h-4 w-4" />
      Not evaluated
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Extracted values                                                           */
/* -------------------------------------------------------------------------- */

type Primitive = string | number | boolean;

const isPrimitive = (value: unknown): value is Primitive =>
  ["string", "number", "boolean"].includes(typeof value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isComplexValue = (value: unknown) =>
  (Array.isArray(value) && value.length > 0) || isRecord(value);

const EMPTY = <span className="font-normal text-slate-400">—</span>;

function ExtractedValue({
  fieldKey,
  value,
  context,
}: {
  fieldKey: string;
  value: unknown;
  context: Record<string, unknown>;
}) {
  if (value === null || value === undefined || value === "") return EMPTY;

  if (typeof value === "number") {
    return (
      <span className="tabular-nums">
        {isAmountKey(fieldKey) ? formatAmount(value, context.currency) : String(value)}
      </span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex rounded border px-1.5 py-0.5 text-xs font-semibold ${
          value
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }

  if (typeof value === "string") {
    return <span>{isDateKey(fieldKey) ? formatDate(value) : value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return EMPTY;

    if (value.every(isPrimitive)) {
      return (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((item, index) => (
            <li
              key={index}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
            >
              {String(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (value.every(isRecord)) {
      return <ObjectTable rows={value} context={context} />;
    }

    return (
      <ul className="space-y-1.5">
        {value.map((item, index) => (
          <li
            key={index}
            className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
          >
            {JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return EMPTY;

    return (
      <dl className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {entries.map(([key, nested]) => (
          <div
            key={key}
            className="grid gap-1 px-4 py-2.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-[13px] font-normal text-slate-500">
              {formatLabel(key)}
            </dt>
            <dd className="min-w-0 text-[13px] font-medium text-slate-900">
              <ExtractedValue fieldKey={key} value={nested} context={context} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span>{String(value)}</span>;
}

function ObjectTable({
  rows,
  context,
}: {
  rows: Record<string, unknown>[];
  context: Record<string, unknown>;
}) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-120 border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-slate-600 ${
                  isAmountKey(column) ? "text-right" : ""
                }`}
              >
                {formatLabel(column)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/50">
              {columns.map((column) => (
                <td
                  key={column}
                  className={`px-4 py-2.5 text-[13px] font-normal text-slate-700 ${
                    isAmountKey(column) ? "text-right" : ""
                  }`}
                >
                  <ExtractedValue
                    fieldKey={column}
                    value={row[column]}
                    context={context}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Workflow timeline                                                          */
/* -------------------------------------------------------------------------- */

type StepState = "done" | "current" | "error" | "upcoming";

type WorkflowStep = { label: string; detail?: string; state: StepState };

function getWorkflowSteps(doc: DocumentDetail): WorkflowStep[] {
  const status = doc.status;
  const validated = doc.guardrail_passed;
  const decided = status === "approved" || status === "rejected";
  const extracted = status !== "draft" && status !== "processing";

  return [
    { label: "Uploaded", detail: formatDateTime(doc.created_at), state: "done" },
    {
      label: "AI extraction",
      detail: doc.processing_error ? "Processing error" : undefined,
      state: doc.processing_error
        ? "error"
        : status === "processing"
          ? "current"
          : extracted
            ? "done"
            : "upcoming",
    },
    {
      label: "AI validation",
      detail:
        validated === true
          ? "Guardrails passed"
          : validated === false
            ? "Guardrails failed"
            : undefined,
      state:
        validated === true
          ? "done"
          : validated === false
            ? "error"
            : status === "pending_review"
              ? "current"
              : "upcoming",
    },
    {
      label: "Manager review",
      detail: status === "pending_review" && validated === true ? "Awaiting decision" : undefined,
      state: decided
        ? "done"
        : status === "pending_review" && validated === true
          ? "current"
          : "upcoming",
    },
    {
      label:
        status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Decision",
      detail: decided ? formatDateTime(doc.updated_at) : undefined,
      state: status === "approved" ? "done" : status === "rejected" ? "error" : "upcoming",
    },
  ];
}

const STEP_MARKER: Record<StepState, string> = {
  done: "border-emerald-600 bg-emerald-600 text-white",
  current: "border-blue-600 bg-white text-blue-600",
  error: "border-red-600 bg-red-600 text-white",
  upcoming: "border-slate-300 bg-white text-slate-300",
};

function WorkflowTimeline({ doc }: { doc: DocumentDetail }) {
  const steps = getWorkflowSteps(doc);

  return (
    <ol className="px-5 py-4">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={`absolute left-2.5 top-6 -ml-px h-[calc(100%-1.5rem)] w-0.5 ${
                step.state === "done" ? "bg-emerald-200" : "bg-slate-200"
              }`}
            />
          )}

          <span
            aria-hidden="true"
            className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${STEP_MARKER[step.state]}`}
          >
            {step.state === "done" && <Icon name="check" className="h-3 w-3" />}
            {step.state === "error" && <Icon name="close" className="h-3 w-3" />}
            {step.state === "current" && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600 motion-reduce:animate-none" />
            )}
          </span>

          <div className="min-w-0">
            <p
              className={`text-[13px] font-semibold ${
                step.state === "upcoming" ? "text-slate-400" : "text-slate-900"
              }`}
            >
              {step.label}
              <span className="sr-only"> ({step.state})</span>
            </p>
            {step.detail && (
              <p
                className={`mt-0.5 text-xs ${
                  step.state === "error" ? "text-red-600" : "text-slate-500"
                }`}
              >
                {step.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Approval deadline                                                          */
/* -------------------------------------------------------------------------- */

function DeadlinePanel({
  doc,
  countdown,
}: {
  doc: DocumentDetail;
  countdown: Countdown;
}) {
  if (doc.status !== "pending_review" || !doc.approval_deadline) return null;

  const tone = countdown.overdue
    ? { bar: "bg-red-500", time: "text-red-700", note: "text-red-700" }
    : countdown.urgent
      ? { bar: "bg-orange-500", time: "text-orange-700", note: "text-orange-700" }
      : { bar: "bg-slate-300", time: "text-slate-900", note: "text-slate-500" };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className={`h-1 ${tone.bar}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {countdown.overdue ? "Approval overdue" : "Approval deadline"}
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {countdown.overdue
                ? "This document is still waiting for a decision."
                : "A manager decision is required before the deadline."}
            </p>
          </div>

          <Icon
            name={countdown.overdue ? "alert" : "calendar"}
            className={`mt-0.5 h-5 w-5 ${tone.time}`}
          />
        </div>

        <p className={`mt-4 text-2xl font-semibold tabular-nums tracking-tight ${tone.time}`}>
          {countdown.overdue ? "Overdue" : countdown.label}
        </p>

        <dl className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
          <Item label="Due">{formatDateTime(doc.approval_deadline)}</Item>
          <Item label="Calendar reminder">
            <span className="inline-flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  doc.calendar_event_created ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              {doc.calendar_event_created ? "Scheduled" : "Not scheduled"}
            </span>
          </Item>
        </dl>

        {!countdown.valid && (
          <p className="mt-3 text-xs text-red-700">
            The stored approval deadline is invalid.
          </p>
        )}

        {!doc.calendar_event_created && countdown.valid && (
          <p className={`mt-3 text-xs ${tone.note}`}>
            The deadline is set, but no calendar reminder was created.
          </p>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Confirm dialog                                                             */
/* -------------------------------------------------------------------------- */

const COPY = {
  approve: {
    title: "Approve this document?",
    description: "will be marked as approved and moved out of the review queue.",
    busy: "Approving...",
    icon: "check_circle",
    iconClass: "bg-emerald-50 text-emerald-600",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  reject: {
    title: "Reject this document?",
    description: "will be marked as rejected and returned to the employee.",
    busy: "Rejecting...",
    icon: "x_circle",
    iconClass: "bg-red-50 text-red-600",
    buttonClass: "bg-red-600 hover:bg-red-700",
  },
} as const;

function ConfirmDialog({
  decision,
  documentTitle,
  isLoading,
  errorMessage,
  onConfirm,
  onCancel,
}: {
  decision: ReviewDecision;
  documentTitle: string;
  isLoading: boolean;
  errorMessage?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}) {
  const copy = COPY[decision];
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const isReject = decision === "reject";
  const trimmedReason = reason.trim();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 20);

    if (isReject) reasonRef.current?.focus();
    else cancelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isReject]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoading, onCancel]);

  const handleConfirm = () => {
    if (isReject && !trimmedReason) return;
    onConfirm(isReject ? trimmedReason : undefined);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className={`w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-900/10 transition-all duration-150 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0"
        }`}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${copy.iconClass}`}
            >
              <Icon name={copy.icon} className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
                {copy.title}
              </h2>
              <p id="confirm-description" className="mt-1 text-sm leading-6 text-slate-600">
                <span className="font-medium text-slate-900">
                  &ldquo;{documentTitle}&rdquo;
                </span>{" "}
                {copy.description}
              </p>
            </div>
          </div>

          {isReject && (
            <div className="mt-5">
              <label
                htmlFor="rejection-reason"
                className="block text-sm font-medium text-slate-800"
              >
                Reason for rejection
              </label>

              <textarea
                ref={reasonRef}
                id="rejection-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={isLoading}
                maxLength={2000}
                rows={5}
                placeholder="Explain what needs to change before this document can be approved."
                className="mt-2 w-full resize-none rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
              />

              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                <p>The employee will see this reason.</p>
                <span className="tabular-nums">{reason.length}/2000</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <Icon name="alert" className="mt-0.5 h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={`rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || (isReject && !trimmedReason)}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${copy.buttonClass} ${focusRing}`}
          >
            {isLoading && (
              <Icon name="loader" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            {isLoading ? copy.busy : isReject ? "Reject document" : "Approve document"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading + error                                                            */
/* -------------------------------------------------------------------------- */

function Bone({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-slate-200/70 motion-reduce:animate-none ${className}`} />
  );
}

function SkeletonPanel({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <Bone className="h-4 w-40" />
      </div>
      <div className="space-y-4 p-5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex gap-6">
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentReviewSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading document" className="space-y-6">
      <div>
        <Bone className="h-3 w-48" />
        <Bone className="mt-4 h-7 w-1/2" />
        <Bone className="mt-3 h-4 w-2/3" />
      </div>
      <Bone className="h-20 w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SkeletonPanel rows={7} />
          <SkeletonPanel rows={3} />
        </div>
        <div className="space-y-6">
          <SkeletonPanel rows={3} />
          <SkeletonPanel rows={4} />
        </div>
      </div>
    </div>
  );
}

function DocumentReviewError({
  title,
  message,
  onRetry,
  onBack,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  onBack: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto mt-10 max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center"
    >
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Icon name="alert" className="h-5 w-5" />
      </span>

      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">{message}</p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${focusRing}`}
        >
          <Icon name="arrow_left" />
          Go back
        </button>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 ${focusRing}`}
          >
            <Icon name="refresh" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Banner                                                                     */
/* -------------------------------------------------------------------------- */

type BannerTone = "info" | "success" | "warning" | "danger";

const BANNER_TONES: Record<BannerTone, string> = {
  info: "border-blue-200 border-l-blue-600 bg-blue-50/60 text-blue-900",
  success: "border-emerald-200 border-l-emerald-600 bg-emerald-50/60 text-emerald-900",
  warning: "border-amber-200 border-l-amber-500 bg-amber-50/60 text-amber-900",
  danger: "border-red-200 border-l-red-600 bg-red-50/60 text-red-900",
};

function Banner({
  tone,
  icon,
  children,
  onDismiss,
}: {
  tone: BannerTone;
  icon: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-md border border-l-4 px-4 py-3 text-[13px] ${BANNER_TONES[tone]}`}
    >
      <Icon
        name={icon}
        className={`mt-0.5 h-4 w-4 ${
          icon === "loader" ? "animate-spin motion-reduce:animate-none" : ""
        }`}
      />

      <div className="flex-1 font-medium">{children}</div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className={`rounded p-0.5 opacity-60 transition hover:opacity-100 ${focusRing}`}
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Decision buttons                                                           */
/* -------------------------------------------------------------------------- */

function DecisionButtons({
  busy,
  onDecision,
}: {
  busy: boolean;
  onDecision: (decision: ReviewDecision) => void;
}) {
  return (
    <div className="flex gap-2.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecision("reject")}
        className={`inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
      >
        <Icon name="x_circle" />
        Reject
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => onDecision("approve")}
        className={`inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
      >
        <Icon name="check_circle" />
        Approve
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
/* -------------------------------------------------------------------------- */

type TabId = "data" | "analysis";

function Tabs({
  active,
  onChange,
  counts,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
  counts: { data: number };
}) {
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "data", label: "Extracted data", count: counts.data },
    { id: "analysis", label: "AI analysis" },
  ];

  return (
    <div role="tablist" aria-label="Document sections" className="flex gap-6 border-b border-slate-200">
      {tabs.map((tab) => {
        const selected = tab.id === active;

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-0.5 pb-3 text-sm font-semibold transition ${focusRing} ${
              selected
                ? "border-blue-600 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Visual + informative blocks                                                */
/* -------------------------------------------------------------------------- */

const EXT_COLORS: Record<string, string> = {
  PDF: "#dc2626",
  DOCX: "#2563eb",
  DOC: "#2563eb",
  XLSX: "#16a34a",
  XLS: "#16a34a",
  CSV: "#16a34a",
  PNG: "#7c3aed",
  JPG: "#7c3aed",
  JPEG: "#7c3aed",
  TXT: "#475569",
};

function getFileExt(fileType?: string | null, fileName?: string | null) {
  const fromName =
    fileName && fileName.includes(".") ? fileName.split(".").pop() : undefined;
  const raw = fromName ?? fileType ?? "";
  const ext = raw.includes("/") ? raw.split("/").pop() ?? "" : raw;

  return ext.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "FILE";
}

/** Inline SVG document illustration, tinted by file type. No network request. */
function FileTypeTile({
  fileType,
  fileName,
}: {
  fileType?: string | null;
  fileName?: string | null;
}) {
  const ext = getFileExt(fileType, fileName);
  const color = EXT_COLORS[ext] ?? "#475569";

  return (
    <svg
      viewBox="0 0 52 68"
      role="img"
      aria-label={`${ext} file`}
      className="h-16 w-12 shrink-0 drop-shadow-sm sm:h-18 sm:w-14"
    >
      <path
        d="M6 2h28l16 16v44a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z"
        fill="#fff"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <path
        d="M34 2v12a4 4 0 0 0 4 4h12"
        fill="#f1f5f9"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <path
        d="M10 28h32M10 35h32M10 42h20"
        stroke="#e2e8f0"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="8" y="48" width="36" height="12" rx="3" fill={color} />
      <text
        x="26"
        y="57"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fill="#fff"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {ext}
      </text>
    </svg>
  );
}

function ExtractionOverview({ data }: { data: Record<string, unknown> | null }) {
  const entries = data ? Object.entries(data) : [];
  if (!data || entries.length === 0) return null;

  const figures = entries
    .filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && isAmountKey(entry[0]),
    )
    .slice(0, 3);

  const filled = entries.filter(([, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    if (isRecord(value)) return Object.keys(value).length > 0;
    return true;
  }).length;

  const percent = Math.round((filled / entries.length) * 100);
  const barColor =
    percent >= 90 ? "bg-emerald-500" : percent >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div
      className={`grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 ${
        figures.length >= 3 ? "xl:grid-cols-4" : figures.length === 2 ? "xl:grid-cols-3" : ""
      }`}
    >
      {figures.map(([key, value]) => (
        <div key={key} className="bg-white px-5 py-4">
          <p className="text-xs text-slate-500">{formatLabel(key)}</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
            {formatAmount(value, data.currency)}
          </p>
        </div>
      ))}

      <div className="bg-white px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs text-slate-500">Extraction completeness</p>
          <p className="text-xs font-semibold tabular-nums text-slate-700">
            {filled} of {entries.length} fields
          </p>
        </div>

        <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
          {percent}%
        </p>

        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Extraction completeness"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
        >
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

type CheckState = "ok" | "warn" | "fail" | "pending";

const CHECK_STYLES: Record<CheckState, { icon: string; box: string }> = {
  ok: { icon: "check", box: "bg-emerald-50 text-emerald-600" },
  warn: { icon: "alert", box: "bg-amber-50 text-amber-600" },
  fail: { icon: "close", box: "bg-red-50 text-red-600" },
  pending: { icon: "clock", box: "bg-slate-100 text-slate-400" },
};

function ReviewChecklist({
  doc,
  countdown,
  fieldCount,
}: {
  doc: DocumentDetail;
  countdown: Countdown;
  fieldCount: number;
}) {
  const confidence = doc.classification_confidence?.toLowerCase();

  const checks: { label: string; detail: string; state: CheckState }[] = [
    {
      label: "Fields extracted",
      detail: fieldCount > 0 ? `${fieldCount} fields found` : "No fields found",
      state: fieldCount > 0 ? "ok" : "fail",
    },
    {
      label: "AI guardrails",
      detail:
        doc.guardrail_passed === true
          ? "All checks passed"
          : doc.guardrail_passed === false
            ? "One or more checks failed"
            : "Not evaluated yet",
      state:
        doc.guardrail_passed === true ? "ok" : doc.guardrail_passed === false ? "fail" : "pending",
    },
    {
      label: "Classification confidence",
      detail: confidence ? titleCase(confidence) : "Not available",
      state:
        confidence === "high"
          ? "ok"
          : confidence === "medium"
            ? "warn"
            : confidence === "low"
              ? "fail"
              : "pending",
    },
    {
      label: "Supported document type",
      detail: doc.document_category === "unsupported" ? "Unsupported" : "Supported",
      state: doc.document_category === "unsupported" ? "fail" : "ok",
    },
    {
      label: "Approval deadline",
      detail: countdown.valid ? formatDateTime(doc.approval_deadline) : "Not set",
      state: !countdown.valid ? "pending" : countdown.overdue ? "fail" : countdown.urgent ? "warn" : "ok",
    },
    {
      label: "Calendar reminder",
      detail: doc.calendar_event_created ? "Scheduled" : "Not scheduled",
      state: doc.calendar_event_created ? "ok" : "warn",
    },
  ];

  const clear = checks.filter((check) => check.state === "ok").length;

  return (
    <Panel
      title="Review checklist"
      description="Signals to check before deciding."
      action={
        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
          {clear}/{checks.length} clear
        </span>
      }
    >
      <ul className="divide-y divide-slate-100 px-5 py-1">
        {checks.map((check) => {
          const style = CHECK_STYLES[check.state];

          return (
            <li key={check.label} className="flex items-start gap-3 py-2.5">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${style.box}`}
              >
                <Icon name={style.icon} className="h-3 w-3" />
                <span className="sr-only">{check.state}</span>
              </span>

              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-900">{check.label}</p>
                <p className="text-xs text-slate-500">{check.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Document content                                                           */
/* -------------------------------------------------------------------------- */

type DocumentReviewContentProps = {
  doc: DocumentDetail;
  canReview: boolean;
  busy: boolean;
  notice: string;
  onDismissNotice: () => void;
  onDecision: (decision: ReviewDecision) => void;
  onBack: () => void;
};

function SummaryCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

function DocumentReviewContent({
  doc,
  canReview,
  busy,
  notice,
  onDismissNotice,
  onDecision,
  onBack,
}: DocumentReviewContentProps) {
  const [tab, setTab] = useState<TabId>("data");
  const countdown = useDeadlineCountdown(doc.approval_deadline);

  const extracted = doc.extracted_data as Record<string, unknown> | null;
  const entries = extracted ? Object.entries(extracted) : [];
  const simpleEntries = entries.filter(([, value]) => !isComplexValue(value));
  const complexEntries = entries.filter(([, value]) => isComplexValue(value));

  const isPending = doc.status === "pending_review";
  const awaitingValidation = isPending && doc.guardrail_passed !== true;
  const showDeadlineInSummary = isPending && !!doc.approval_deadline;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex items-center gap-1.5 rounded font-medium transition hover:text-slate-900 ${focusRing}`}
          >
            <Icon name="arrow_left" className="h-3.5 w-3.5" />
            Documents
          </button>
          <Icon name="chevron_right" className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-medium text-slate-700">Review #{doc.id}</span>
        </nav>

        <div className="relative mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 text-slate-200/80"
            style={{
              maskImage: "linear-gradient(to left, black, transparent)",
              WebkitMaskImage: "linear-gradient(to left, black, transparent)",
            }}
          >
            <defs>
              <pattern id="header-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#header-dots)" />
          </svg>

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <FileTypeTile fileType={doc.file_type} fileName={doc.file_name} />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="wrap-break-word text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {doc.title}
                  </h1>
                  <StatusBadge status={doc.status} />
                </div>

                <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-slate-500">
                  <div className="flex gap-1.5">
                    <dt>File</dt>
                    <dd className="break-all font-medium text-slate-700">{doc.file_name}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Size</dt>
                    <dd className="font-medium text-slate-700">{formatFileSize(doc.file_size)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Uploaded</dt>
                    <dd className="font-medium text-slate-700">{formatDateTime(doc.created_at)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {canReview && (
              <div className="shrink-0">
                <DecisionButtons busy={busy} onDecision={onDecision} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notices */}
      {(notice ||
        doc.status === "processing" ||
        awaitingValidation ||
        (isPending && (countdown.urgent || countdown.overdue))) && (
        <div className="space-y-3">
          {notice && (
            <Banner tone="success" icon="check_circle" onDismiss={onDismissNotice}>
              {notice}
            </Banner>
          )}

          {doc.status === "processing" && (
            <Banner tone="info" icon="loader">
              This document is still being processed. The page refreshes automatically.
            </Banner>
          )}

          {awaitingValidation && (
            <Banner tone="warning" icon="shield_alert">
              Approve and reject are unavailable until AI validation passes for this document.
            </Banner>
          )}

          {isPending && countdown.overdue && (
            <Banner tone="danger" icon="alert">
              The approval deadline has passed. This document still needs a decision.
            </Banner>
          )}

          {isPending && countdown.urgent && !countdown.overdue && (
            <Banner tone="warning" icon="clock">
              The approval deadline is close.{" "}
              <span className="font-bold tabular-nums">{countdown.label}</span> remaining.
            </Banner>
          )}
        </div>
      )}

      {/* Summary strip */}
      <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCell label="Document type">{formatCategory(doc.document_category)}</SummaryCell>

        <SummaryCell label="Classification confidence">
          <ConfidenceBadge confidence={doc.classification_confidence} />
        </SummaryCell>

        <SummaryCell label="AI validation">
          <ValidationBadge passed={doc.guardrail_passed} />
        </SummaryCell>

        {showDeadlineInSummary ? (
          <SummaryCell label="Time to deadline">
            <span
              className={`tabular-nums ${
                countdown.overdue
                  ? "text-red-700"
                  : countdown.urgent
                    ? "text-orange-700"
                    : "text-slate-900"
              }`}
            >
              {countdown.overdue ? "Overdue" : countdown.label}
            </span>
          </SummaryCell>
        ) : (
          <SummaryCell label="Indexed for search (RAG)">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="database" className="h-4 w-4 text-slate-400" />
              {doc.guardrail_passed ? "Yes" : "No"}
            </span>
          </SummaryCell>
        )}
      </dl>

      {/* Body */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          {doc.processing_error && (
            <Banner tone="danger" icon="alert">
              <p className="font-semibold">Processing error</p>
              <p className="mt-1 whitespace-pre-wrap wrap-break-word font-normal">
                {doc.processing_error}
              </p>
            </Banner>
          )}

          <ExtractionOverview data={extracted} />

          <Tabs active={tab} onChange={setTab} counts={{ data: entries.length }} />

          {tab === "data" && (
            <div id="panel-data" role="tabpanel" aria-labelledby="tab-data">
              <Panel
                title="Extracted information"
                description="Structured fields the AI read from this document."
              >
                {!extracted || entries.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      No extracted information available
                    </p>
                    <p className="mt-1 text-[13px] text-slate-500">
                      The document may not have been processed successfully.
                    </p>
                  </div>
                ) : (
                  <>
                    {simpleEntries.length > 0 && (
                      <dl className="divide-y divide-slate-100">
                        {simpleEntries.map(([key, value]) => (
                          <Row key={key} label={formatLabel(key)}>
                            <ExtractedValue fieldKey={key} value={value} context={extracted} />
                          </Row>
                        ))}
                      </dl>
                    )}

                    {complexEntries.map(([key, value]) => (
                      <div key={key} className="border-t border-slate-200 px-5 py-4">
                        <h3 className="mb-3 text-[13px] font-semibold text-slate-900">
                          {formatLabel(key)}
                        </h3>
                        <div className="text-[13px] font-medium text-slate-800">
                          <ExtractedValue fieldKey={key} value={value} context={extracted} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </Panel>
            </div>
          )}

          {tab === "analysis" && (
            <div id="panel-analysis" role="tabpanel" aria-labelledby="tab-analysis" className="space-y-6">
              <Panel
                title="AI classification"
                description="How the document was categorized from its content."
              >
                <dl className="divide-y divide-slate-100">
                  <Row label="Document type">{formatCategory(doc.document_category)}</Row>
                  <Row label="Confidence">
                    <ConfidenceBadge confidence={doc.classification_confidence} />
                  </Row>
                  <Row label="Support status">
                    {doc.document_category === "unsupported"
                      ? "Unsupported document"
                      : "Supported document"}
                  </Row>
                </dl>

                <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-4">
                  <h3 className="text-xs font-semibold text-slate-500">Reasoning</h3>
                  <p className="mt-1.5 max-w-prose text-[13px] leading-6 text-slate-700">
                    {doc.classification_reason || "No classification reason available."}
                  </p>
                </div>
              </Panel>

              <Panel
                title="AI validation and guardrails"
                description="Checks run on the extracted data during processing."
              >
                <div className="p-5">
                  {doc.guardrail_passed === true ? (
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <Icon name="shield_check" className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Guardrails passed</h3>
                        <p className="mt-0.5 text-[13px] text-slate-600">
                          The extracted information passed every configured validation check.
                        </p>
                      </div>
                    </div>
                  ) : doc.guardrail_passed === false ? (
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                        <Icon name="shield_alert" className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">Guardrails failed</h3>

                        {doc.guardrail_errors && doc.guardrail_errors.length > 0 ? (
                          <ul className="mt-3 divide-y divide-red-100 rounded-md border border-red-200 bg-red-50/50">
                            {doc.guardrail_errors.map((guardrailError, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2.5 px-3.5 py-2.5 text-[13px] text-red-800"
                              >
                                <Icon name="close" className="mt-0.5 h-3.5 w-3.5 text-red-500" />
                                {guardrailError}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-0.5 text-[13px] text-slate-600">
                            Validation failed without a detailed error.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate-600">
                      Guardrails have not been evaluated for this document.
                    </p>
                  )}
                </div>
              </Panel>
            </div>
          )}
        </div>

        {/* Side rail */}
        <aside className="min-w-0 space-y-6">
          <DeadlinePanel doc={doc} countdown={countdown} />

          {(isPending || doc.status === "processing") && (
            <ReviewChecklist doc={doc} countdown={countdown} fieldCount={entries.length} />
          )}

          {doc.status === "approved" && (
            <section className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
              <Icon name="check_circle" className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-sm font-semibold text-emerald-900">Document approved</h2>
                <p className="mt-0.5 text-[13px] text-emerald-800">
                  This document has completed the approval stage.
                </p>
              </div>
            </section>
          )}

          {doc.status === "rejected" && (
            <section className="rounded-lg border border-red-200 bg-red-50/60 p-5">
              <div className="flex items-start gap-3">
                <Icon name="x_circle" className="mt-0.5 h-5 w-5 text-red-600" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-red-900">Document rejected</h2>
                  <p className="mt-0.5 text-[13px] text-red-800">
                    This document was rejected during review.
                  </p>
                </div>
              </div>

              {doc.rejection_reason && (
                <div className="mt-4 rounded-md border border-red-200 bg-white p-3.5">
                  <p className="text-xs font-semibold text-red-700">Reason</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-slate-800">
                    {doc.rejection_reason}
                  </p>
                </div>
              )}
            </section>
          )}

          <Panel title="Workflow" description="Where this document is in the process.">
            <WorkflowTimeline doc={doc} />
          </Panel>

          <Panel title="Document details">
            <dl className="divide-y divide-slate-100 px-5 py-1">
              <Item label="File name">
                <span className="break-all">{doc.file_name}</span>
              </Item>
              <Item label="File type">{doc.file_type}</Item>
              <Item label="File size">{formatFileSize(doc.file_size)}</Item>
              <Item label="Category">{formatCategory(doc.document_category)}</Item>
              <Item label="Uploaded">{formatDateTime(doc.created_at)}</Item>
              <Item label="Last updated">{formatDateTime(doc.updated_at)}</Item>
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard shell                                                            */
/* -------------------------------------------------------------------------- */

function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-slate-900 antialiased">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-62.5">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-4 sm:p-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-350">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

const SUCCESS_MESSAGE: Record<ReviewDecision, string> = {
  approve: "Document approved successfully.",
  reject: "Document rejected.",
};

const FAILURE_MESSAGE: Record<ReviewDecision, string> = {
  approve: "Failed to approve the document.",
  reject: "Failed to reject the document.",
};

export default function DocumentReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = Number(params.id);

  const user = useAuthStore((state) => state.user);

  const {
    isValidId,
    document: doc,
    canReview,
    isLoading,
    isError,
    error,
    refetch,
    decide,
  } = useDocumentReview(documentId, user?.role);

  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(null);
  const [notice, setNotice] = useState("");

  const goBack = () => router.back();

  const openDecision = (decision: ReviewDecision) => {
    decide.reset();
    setNotice("");
    setPendingDecision(decision);
  };

  const closeDialog = () => {
    if (!decide.isPending) setPendingDecision(null);
  };

  const confirmDecision = (reason?: string) => {
    if (!pendingDecision) return;

    const decision = pendingDecision;

    decide.mutate(
      { decision, reason },
      {
        onSuccess: () => {
          setPendingDecision(null);
          setNotice(SUCCESS_MESSAGE[decision]);
        },
      },
    );
  };

  let body;

  if (!isValidId) {
    body = (
      <DocumentReviewError
        title="Invalid document"
        message="The document ID in the address is not valid."
        onBack={goBack}
      />
    );
  } else if (isLoading) {
    body = <DocumentReviewSkeleton />;
  } else if (isError || !doc) {
    body = (
      <DocumentReviewError
        title={
          getErrorStatus(error) === 404
            ? "Document not found"
            : "Document could not be loaded"
        }
        message={getApiErrorMessage(error, "Unable to load this document.")}
        onRetry={() => refetch()}
        onBack={goBack}
      />
    );
  } else {
    body = (
      <DocumentReviewContent
        doc={doc}
        canReview={canReview}
        busy={decide.isPending}
        notice={notice}
        onDismissNotice={() => setNotice("")}
        onDecision={openDecision}
        onBack={goBack}
      />
    );
  }

  return (
    <ProtectedRoute>
      <DashboardShell>{body}</DashboardShell>

      {pendingDecision && doc && (
        <ConfirmDialog
          decision={pendingDecision}
          documentTitle={doc.title}
          isLoading={decide.isPending}
          errorMessage={
            decide.isError
              ? getApiErrorMessage(decide.error, FAILURE_MESSAGE[pendingDecision])
              : undefined
          }
          onConfirm={confirmDecision}
          onCancel={closeDialog}
        />
      )}
    </ProtectedRoute>
  );
}