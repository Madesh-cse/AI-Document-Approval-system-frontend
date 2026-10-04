"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "./Icon";
import type { RecentDocument } from "@/services/dashboardService";

interface RecentDocumentsProps {
  documents: RecentDocument[];
  onReview?: (document: RecentDocument) => void;
  /** Where the "View all" link goes */
  viewAllHref?: string;
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bdc]";

// ── Status ────────────────────────────────────────────────────────────────
type StatusStyle = {
  label: string;
  badge: string;
  dot: string;
};

const STATUS: Record<RecentDocument["status"], StatusStyle> = {
  draft: {
    label: "Draft",
    badge: "bg-slate-50 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  processing: {
    label: "Processing",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500 animate-pulse motion-reduce:animate-none",
  },
  pending_review: {
    label: "Pending Review",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
};

// Fallback if the API ever returns a status we don't know yet
const getStatus = (status: string): StatusStyle =>
  STATUS[status as RecentDocument["status"]] ?? {
    label: status.replace(/_/g, " "),
    badge: "bg-slate-50 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  };

function StatusBadge({ status }: { status: string }) {
  const { label, badge, dot } = getStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ── File type ─────────────────────────────────────────────────────────────
// "invoice_1024.pdf" -> "PDF"
const getFileType = (fileName: string) => {
  const dot = fileName.lastIndexOf(".");

  return dot > -1 && dot < fileName.length - 1
    ? fileName.slice(dot + 1).toUpperCase()
    : "—";
};

const FILE_TYPE_STYLES: Record<string, string> = {
  PDF: "bg-red-50 text-red-600 ring-red-100",
  DOC: "bg-blue-50 text-blue-600 ring-blue-100",
  DOCX: "bg-blue-50 text-blue-600 ring-blue-100",
  XLS: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  XLSX: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  CSV: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  PNG: "bg-violet-50 text-violet-600 ring-violet-100",
  JPG: "bg-violet-50 text-violet-600 ring-violet-100",
  JPEG: "bg-violet-50 text-violet-600 ring-violet-100",
};

function FileTypeTile({ type }: { type: string }) {
  const style =
    FILE_TYPE_STYLES[type] ?? "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold tracking-wide ring-1 ring-inset ${style}`}
    >
      {type === "—" ? <Icon name="file" className="h-4 w-4" /> : type.slice(0, 4)}
    </span>
  );
}

// ── Dates ─────────────────────────────────────────────────────────────────
const parseDate = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: string) => {
  const date = parseDate(value);

  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value: string) => {
  const date = parseDate(value);

  if (!date) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Component ─────────────────────────────────────────────────────────────
export default function RecentDocuments({
  documents,
  onReview,
  viewAllHref = "/documents",
}: RecentDocumentsProps) {
  const [query, setQuery] = useState("");

  const search = query.trim().toLowerCase();

  const filteredDocuments = search
    ? documents.filter((document) =>
        [
          document.title,
          document.file_name,
          getFileType(document.file_name),
          getStatus(document.status).label,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
      )
    : documents;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Documents
            </h2>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {documents.length}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Recently uploaded and processed documents.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              aria-label="Search recent documents"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#315bdc] focus:bg-white focus:ring-2 focus:ring-[#315bdc]/20 sm:w-56"
            />
          </div>

          <Link
            href={viewAllHref}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#315bdc] hover:text-[#315bdc] ${focusRing}`}
          >
            View all
            <Icon name="arrow_right" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 border-collapse">
          <caption className="sr-only">Recently uploaded documents</caption>

          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Document
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Type
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Uploaded
              </th>

              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>

              <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredDocuments.map((document) => {
              const fileType = getFileType(document.file_name);

              return (
                <tr
                  key={document.id}
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                >
                  {/* Document */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileTypeTile type={fileType} />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {document.title}
                        </p>

                        <p className="mt-0.5 max-w-[320px] truncate text-xs text-slate-400">
                          {document.file_name}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {fileType}
                    </span>
                  </td>

                  {/* Uploaded */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <p className="text-sm text-slate-700">
                      {formatDate(document.created_at)}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatTime(document.created_at)}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge status={document.status} />
                  </td>

                  {/* Action */}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onReview?.(document)}
                      aria-label={`View ${document.title}`}
                      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#315bdc] hover:text-[#315bdc] ${focusRing}`}
                    >
                      <Icon name="eye" className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty */}
        {filteredDocuments.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Icon name="file" className="h-5 w-5" />
            </div>

            <p className="text-sm font-semibold text-slate-700">
              {documents.length === 0
                ? "No documents uploaded yet"
                : "No matching documents"}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {documents.length === 0
                ? "Uploaded documents will appear here."
                : `Nothing matches "${query}".`}
            </p>

            {documents.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className={`mt-4 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${focusRing}`}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {documents.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3">
          <p className="text-xs text-slate-500" aria-live="polite">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {filteredDocuments.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {documents.length}
            </span>{" "}
            recent documents
          </p>

          <Link
            href={viewAllHref}
            className={`inline-flex items-center gap-1 rounded text-xs font-semibold text-[#315bdc] hover:underline ${focusRing}`}
          >
            View all documents
            <Icon name="arrow_right" className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}