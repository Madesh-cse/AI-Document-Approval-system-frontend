"use client";

import { isAxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import {approveDocument,getDocument,rejectDocument,} from "@/services/documentService";
import { useAuthStore } from "@/store/authStore";


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

/** "purchase_order" -> "Purchase Order" ("—" when empty) */
function formatCategory(category?: string | null) {
  return category ? titleCase(category) : "—";
}

/** "pending_review" -> "Pending Review" */
function formatStatus(status: string) {
  return titleCase(status);
}

/** "vendor_legal_name" -> "Vendor Legal Name" */
function formatLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "23 Sep 2026, 10:15 am" */
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

/** "23 Sep 2026" (falls back to the raw text if it isn't a valid date) */
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

// Extracted-data keys that hold money values
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
const isDateKey = (key: string) =>
  key === "date" || key.endsWith("_date");


/** Type of a single document, taken straight from the service */
type DocumentDetail = Awaited<ReturnType<typeof getDocument>>;
type ReviewDecision = "approve" | "reject";
/** One place for every query key, so invalidation never drifts */
const documentKeys = {
  list: ["documents"] as const,
  detail: (id: number) => ["document", id] as const,
};

const PROCESSING_POLL_MS = 5000;
// Custom hook for managing document review logic
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
      query.state.data?.status === "processing"
        ? PROCESSING_POLL_MS
        : false,

    retry: (failureCount, error) => {
      const status = getErrorStatus(error);

      if (status && status >= 400 && status < 500) {
        return false;
      }

      return failureCount < 2;
    },
  });

  const decide = useMutation({
    mutationFn: (decision: ReviewDecision) =>
      decision === "approve"
        ? approveDocument(documentId)
        : rejectDocument(documentId),

    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(
        documentKeys.detail(documentId),
        updatedDocument,
      );

      queryClient.invalidateQueries({
        queryKey: documentKeys.list,
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  const document = documentQuery.data;

  const isReviewer =userRole === "manager" ||userRole === "admin";
  const canReview =(userRole === "admin" || userRole === "manager") && document?.status === "pending_review" && document.guardrail_passed === true;
  return {
    isValidId,
    document,
    canReview,
    isLoading: documentQuery.isLoading,
    isError: documentQuery.isError,
    error: documentQuery.error,
    refetch: documentQuery.refetch,
    decide,
  };
}


const ICONS: Record<string, ReactNode> = {
  arrow_left: (
    <>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </>
  ),
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
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
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
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
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

// ── Layout pieces ─────────────────────────────────────────────────────────
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

function SectionCard({
  title,
  description,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon name={icon} />
            </span>
          )}

          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
        </div>

        {action}
      </header>

      <div className="p-6">{children}</div>
    </section>
  );
}

/** Label + value pair. Use inside a <dl>. */
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 wrap-break-words text-sm font-medium text-slate-900">
        {children}
      </dd>
    </div>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  draft: {
    badge: "bg-slate-50 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
  },
  processing: {
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500 animate-pulse motion-reduce:animate-none",
  },
  pending_review: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  approved: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
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

function ConfidenceBadge({
  confidence,
}: {
  confidence?: string | null;
}) {
  if (!confidence) {
    return <span className="text-sm font-normal text-slate-500">Not available</span>;
  }

  const key = confidence.toLowerCase();
  const style = CONFIDENCE_LEVELS[key];
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
            className={`h-1.5 w-4 rounded-full ${
              style && segment <= style.level ? style.bar : "bg-slate-200"
            }`}
          />
        ))}
      </span>

      <span className={`text-sm font-semibold ${style?.text ?? "text-slate-700"}`}>
        {label}
      </span>
    </span>
  );
}

function ValidationBadge({ passed }: { passed?: boolean | null }) {
  if (passed === true) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <Icon name="shield_check" className="h-3.5 w-3.5" />
        Passed
      </span>
    );
  }

  if (passed === false) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
        <Icon name="shield_alert" className="h-3.5 w-3.5" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
      <Icon name="clock" className="h-3.5 w-3.5" />
      Not evaluated
    </span>
  );
}


type Primitive = string | number | boolean;
const isPrimitive = (value: unknown): value is Primitive =>
  ["string", "number", "boolean"].includes(typeof value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Lists and objects are shown full-width; simple values sit in a 2-column grid */
const isComplexValue = (value: unknown) =>
  (Array.isArray(value) && value.length > 0) || isRecord(value);

const EMPTY = <span className="font-normal text-slate-400">—</span>;

type ExtractedValueProps = {
  fieldKey: string;
  value: unknown;
  /** The whole extracted object (used to read e.g. the currency) */
  context: Record<string, unknown>;
};

function ExtractedValue({
  fieldKey,
  value,
  context,
}: ExtractedValueProps) {
  if (value === null || value === undefined || value === "") {
    return EMPTY;
  }

  if (typeof value === "number") {
    return isAmountKey(fieldKey) ? (
      <span className="tabular-nums">
        {formatAmount(value, context.currency)}
      </span>
    ) : (
      <span className="tabular-nums">{String(value)}</span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
          value
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-slate-50 text-slate-600 ring-slate-200"
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

    // ["a", "b"] -> chips
    if (value.every(isPrimitive)) {
      return (
        <ul className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <li
              key={index}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {String(item)}
            </li>
          ))}
        </ul>
      );
    }

    // [{...}, {...}] -> table (e.g. invoice line items)
    if (value.every(isRecord)) {
      return <ObjectTable rows={value} context={context} />;
    }

    return (
      <ul className="space-y-1.5">
        {value.map((item, index) => (
          <li
            key={index}
            className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700"
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
      <dl className="grid gap-x-6 gap-y-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        {entries.map(([key, nested]) => (
          <div key={key}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {formatLabel(key)}
            </dt>

            <dd className="mt-0.5 text-sm font-medium text-slate-800">
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
  // Union of all keys, in first-seen order
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-120 text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >
                {formatLabel(column)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-slate-100 last:border-0"
            >
              {columns.map((column) => (
                <td
                  key={column}
                  className="px-4 py-2.5 text-sm font-normal text-slate-700"
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

// Confirm dialog
type ConfirmDialogProps = {
  decision: ReviewDecision;
  documentTitle: string;
  isLoading: boolean;
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const COPY = {
  approve: {
    title: "Approve this document?",
    description: "will be marked as approved.",
    action: "Approve",
    busy: "Approving...",
    icon: "check_circle",
    iconClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  reject: {
    title: "Reject this document?",
    description: "will be marked as rejected.",
    action: "Reject",
    busy: "Rejecting...",
    icon: "x_circle",
    iconClass: "bg-red-50 text-red-600 ring-red-100",
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
}: ConfirmDialogProps) {
  const copy = COPY[decision];

  const [visible, setVisible] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Fade in, focus the safe option, lock page scroll
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 20);

    cancelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Escape closes (unless a request is running); Tab stays inside the dialog
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const first = cancelRef.current;
      const last = confirmRef.current;

      if (!first || !last) return;

      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoading, onCancel]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        // Click on the dark backdrop closes the dialog
        if (event.target === event.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className={`w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 transition-all duration-200 ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-4 ${copy.iconClass}`}
          >
            <Icon name={copy.icon} className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <h2
              id="confirm-title"
              className="text-lg font-semibold text-slate-900"
            >
              {copy.title}
            </h2>

            <p
              id="confirm-description"
              className="mt-1.5 text-sm leading-6 text-slate-600"
            >
              <span className="wrap-break-words font-medium text-slate-900">
                &ldquo;{documentTitle}&rdquo;
              </span>{" "}
              {copy.description} Please confirm you have reviewed the extracted
              information.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            <Icon name="alert" className="mt-0.5 h-4 w-4" />
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={`rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            Cancel
          </button>

          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${copy.buttonClass} ${focusRing}`}
          >
            {isLoading && (
              <Icon
                name="loader"
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
            )}
            {isLoading ? copy.busy : copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}
// Loading and error states
function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/70 motion-reduce:animate-none ${className}`}
    />
  );
}

function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
      <Bone className="h-4 w-40" />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index}>
            <Bone className="h-3 w-24" />
            <Bone className="mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder with the same shape as the real page, shown while loading */
function DocumentReviewSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading document"
      className="space-y-6"
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
        <Bone className="h-4 w-36" />
        <Bone className="mt-5 h-8 w-2/3" />
        <Bone className="mt-4 h-4 w-1/2" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SkeletonCard rows={6} />
          <SkeletonCard rows={3} />
        </div>

        <div className="space-y-6">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={4} />
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
      className="mx-auto mt-10 max-w-lg rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm"
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-4 ring-red-50/60">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${focusRing}`}
        >
          <Icon name="arrow_left" />
          Go back
        </button>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 ${focusRing}`}
          >
            <Icon name="refresh" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

// Page content

type DocumentReviewContentProps = {
  doc: DocumentDetail;
  canReview: boolean;
  busy: boolean;
  notice: string;
  onDismissNotice: () => void;
  onDecision: (decision: ReviewDecision) => void;
  onBack: () => void;
};

const BANNER_TONES = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
} as const;

function Banner({
  tone,
  icon,
  children,
  onDismiss,
}: {
  tone: keyof typeof BANNER_TONES;
  icon: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${BANNER_TONES[tone]}`}
    >
      <Icon
        name={icon}
        className={`mt-0.5 h-4 w-4 ${
          icon === "loader" ? "animate-spin motion-reduce:animate-none" : ""
        }`}
      />

      <div className="flex-1">{children}</div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className={`rounded p-0.5 opacity-70 transition hover:opacity-100 ${focusRing}`}
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DecisionButtons({
  busy,
  onDecision,
  stacked = false,
}: {
  busy: boolean;
  onDecision: (decision: ReviewDecision) => void;
  stacked?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${stacked ? "flex-col" : ""}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecision("reject")}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
      >
        <Icon name="x_circle" />
        Reject
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => onDecision("approve")}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
      >
        <Icon name="check_circle" />
        Approve
      </button>
    </div>
  );
}

const Dot = () => (
  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" />
);

// ── Page content ──────────────────────────────────────────────────────────
function DocumentReviewContent({
  doc,
  canReview,
  busy,
  notice,
  onDismissNotice,
  onDecision,
  onBack,
}: DocumentReviewContentProps) {
  const extracted = doc.extracted_data as Record<string, unknown> | null;
  const entries = extracted ? Object.entries(extracted) : [];

  const simpleEntries = entries.filter(([, value]) => !isComplexValue(value));
  const complexEntries = entries.filter(([, value]) => isComplexValue(value));

  const awaitingValidation =
    doc.status === "pending_review" && doc.guardrail_passed !== true;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <header className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-500 transition hover:text-slate-900 ${focusRing}`}
        >
          <Icon name="arrow_left" />
          Back to Documents
        </button>

        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="wrap-break-words text-2xl font-semibold tracking-tight text-slate-900">
                {doc.title}
              </h1>

              <StatusBadge status={doc.status} />
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <span>Document #{doc.id}</span>
              <Dot />
              <span>{doc.file_type}</span>
              <Dot />
              <span>{formatFileSize(doc.file_size)}</span>
              <Dot />
              <span>Uploaded {formatDateTime(doc.created_at)}</span>
            </p>
          </div>

          {canReview && (
            <div className="shrink-0">
              <DecisionButtons busy={busy} onDecision={onDecision} />
            </div>
          )}
        </div>
      </header>

      {/* ── Banners ── */}
      {(notice || doc.status === "processing" || awaitingValidation) && (
        <div className="space-y-3">
          {notice && (
            <Banner tone="success" icon="check_circle" onDismiss={onDismissNotice}>
              {notice}
            </Banner>
          )}

          {doc.status === "processing" && (
            <Banner tone="info" icon="loader">
              This document is still being processed. This page refreshes
              automatically.
            </Banner>
          )}

          {awaitingValidation && (
            <Banner tone="warning" icon="shield_alert">
              Review actions are unavailable until AI validation has passed for
              this document.
            </Banner>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Extracted information */}
          <SectionCard
            title="Extracted Information"
            description="Structured information extracted from the document."
            icon="list"
            action={
              entries.length > 0 ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {entries.length} {entries.length === 1 ? "field" : "fields"}
                </span>
              ) : undefined
            }
          >
            {!extracted || entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No extracted information is available.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  The document may not have been successfully processed.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {simpleEntries.length > 0 && (
                  <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {simpleEntries.map(([key, value]) => (
                      <Field key={key} label={formatLabel(key)}>
                        <ExtractedValue
                          fieldKey={key}
                          value={value}
                          context={extracted}
                        />
                      </Field>
                    ))}
                  </dl>
                )}

                {complexEntries.map(([key, value]) => (
                  <div key={key}>
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {formatLabel(key)}
                    </h3>

                    <div className="text-sm font-medium text-slate-800">
                      <ExtractedValue
                        fieldKey={key}
                        value={value}
                        context={extracted}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* AI classification */}
          <SectionCard
            title="AI Classification"
            description="Classification generated from the document content."
            icon="sparkles"
          >
            <dl className="grid gap-6 md:grid-cols-3">
              <Field label="Document Type">
                <span className="text-base font-semibold">
                  {formatCategory(doc.document_category)}
                </span>
              </Field>

              <Field label="Confidence">
                <ConfidenceBadge confidence={doc.classification_confidence} />
              </Field>

              <Field label="Classification Status">
                {doc.document_category === "unsupported"
                  ? "Unsupported document"
                  : "Supported document"}
              </Field>
            </dl>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Classification Reason
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {doc.classification_reason ||
                  "No classification reason available."}
              </p>
            </div>
          </SectionCard>

          {/* Guardrails */}
          <SectionCard
            title="AI Validation & Guardrails"
            description="Validation results produced during document processing."
            icon="shield_check"
          >
            {doc.guardrail_passed === true ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Icon name="shield_check" className="h-5 w-5" />
                </span>

                <div>
                  <h3 className="font-semibold text-emerald-800">
                    Guardrails Passed
                  </h3>

                  <p className="mt-1 text-sm text-emerald-700">
                    The extracted information passed the configured validation
                    checks.
                  </p>
                </div>
              </div>
            ) : doc.guardrail_passed === false ? (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <Icon name="shield_alert" className="h-5 w-5" />
                </span>

                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">
                    Guardrails Failed
                  </h3>

                  {doc.guardrail_errors && doc.guardrail_errors.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {doc.guardrail_errors.map((guardrailError, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-red-700"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red-400"
                          />
                          {guardrailError}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-red-700">
                      Validation failed without a detailed error.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">
                  Guardrails have not been evaluated for this document.
                </p>
              </div>
            )}
          </SectionCard>

          {/* Processing error */}
          {doc.processing_error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-red-800">
                <Icon name="alert" />
                Processing Error
              </h2>

              <p className="mt-3 whitespace-pre-wrap wrap-break-words text-sm leading-6 text-red-700">
                {doc.processing_error}
              </p>
            </section>
          )}
        </div>

        {/* Side column */}
        <aside className="space-y-6">
          {/* Review decision / outcome */}
          {canReview && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-[15px] font-semibold text-slate-900">
                Review Decision
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Review the AI-generated information before making an approval
                decision.
              </p>

              <div className="mt-5">
                <DecisionButtons busy={busy} onDecision={onDecision} stacked />
              </div>
            </section>
          )}

          {doc.status === "approved" && (
            <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Icon name="check_circle" className="h-5 w-5" />
              </span>

              <div>
                <h2 className="font-semibold text-emerald-800">
                  Document Approved
                </h2>

                <p className="mt-1 text-sm text-emerald-700">
                  This document has completed the approval stage.
                </p>
              </div>
            </section>
          )}

          {doc.status === "rejected" && (
            <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                <Icon name="x_circle" className="h-5 w-5" />
              </span>

              <div>
                <h2 className="font-semibold text-red-800">
                  Document Rejected
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  This document was rejected during the review process.
                </p>
              </div>
            </section>
          )}

          {/* Workflow */}
          <SectionCard
            title="Workflow"
            description="Current document state."
            icon="clock"
          >
            <dl className="space-y-5">
              <Field label="Status">
                <StatusBadge status={doc.status} />
              </Field>

              <Field label="AI Validation">
                <ValidationBadge passed={doc.guardrail_passed} />
              </Field>

              <Field label="Indexed for RAG">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="database" className="h-4 w-4 text-slate-400" />
                  {doc.guardrail_passed ? "Yes" : "No"}
                </span>
              </Field>
            </dl>
          </SectionCard>

          {/* Document information */}
          <SectionCard
            title="Document Information"
            description="Basic information about the uploaded document."
            icon="file"
          >
            <dl className="space-y-5">
              <Field label="File Name">
                <span className="break-all">{doc.file_name}</span>
              </Field>

              <div className="grid grid-cols-2 gap-5">
                <Field label="File Type">{doc.file_type}</Field>
                <Field label="File Size">{formatFileSize(doc.file_size)}</Field>
              </div>

              <Field label="Category">
                {formatCategory(doc.document_category)}
              </Field>

              <Field label="Uploaded">{formatDateTime(doc.created_at)}</Field>

              <Field label="Last Updated">
                {formatDateTime(doc.updated_at)}
              </Field>
            </dl>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-62.5">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-350">{children}</div>
        </main>
      </div>
    </div>
  );
}

// Page

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
  // All data fetching + mutations live in the hook
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
  const [pendingDecision, setPendingDecision] =
    useState<ReviewDecision | null>(null);
  const [notice, setNotice] = useState("");
  const goBack = () => router.back();
  const openDecision = (decision: ReviewDecision) => {
    decide.reset(); // clear any previous error
    setNotice("");
    setPendingDecision(decision);
  };

  const closeDialog = () => {
    if (!decide.isPending) setPendingDecision(null);
  };

  const confirmDecision = () => {
    if (!pendingDecision) return;

    const decision = pendingDecision;

    decide.mutate(decision, {
      onSuccess: () => {
        setPendingDecision(null);
        setNotice(SUCCESS_MESSAGE[decision]);
      },
    });
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
              ? getApiErrorMessage(
                  decide.error,
                  FAILURE_MESSAGE[pendingDecision],
                )
              : undefined
          }
          onConfirm={confirmDecision}
          onCancel={closeDialog}
        />
      )}
    </ProtectedRoute>
  );
}