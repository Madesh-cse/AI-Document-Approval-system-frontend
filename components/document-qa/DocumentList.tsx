"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getDocuments } from "@/services/documentService";

interface DocumentListProps {
  selectedDocumentId: number | null;
  onSelectDocument: (documentId: number) => void;
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bdc]";

// ── Icons (inline SVG, self-contained) ────────────────────────────────────
const ICONS: Record<string, ReactNode> = {
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
  x: <path d="M18 6 6 18M6 6l12 12" />,
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8M16 13H8M16 17H8" />
    </>
  ),
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
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

// ── Helpers ───────────────────────────────────────────────────────────────
// "invoice_1024.pdf" -> "PDF"
const getFileType = (fileName?: string | null) => {
  if (!fileName) return "—";

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

// "purchase_order" -> "Purchase Order"
const formatCategory = (category?: string | null) =>
  category
    ? category
        .split("_")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "";

const formatDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const STATUS: Record<string, { label: string; dot: string }> = {
  approved: { label: "Approved", dot: "bg-emerald-500" },
  pending_review: { label: "Pending Approval", dot: "bg-amber-500" },
  rejected: { label: "Rejected", dot: "bg-red-500" },
  processing: {
    label: "Processing",
    dot: "bg-blue-500 animate-pulse motion-reduce:animate-none",
  },
  draft: { label: "Draft", dot: "bg-slate-400" },
};

function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/70 motion-reduce:animate-none ${className}`}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────
export default function DocumentList({
  selectedDocumentId,
  onSelectDocument,
}: DocumentListProps) {
  const [search, setSearch] = useState("");

  // Same cache key as the Documents page, so the list is shared and cached
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const documents = useMemo(() => data?.documents ?? [], [data]);

  // Keep the latest callback without re-running effects when the parent re-renders
  const onSelectRef = useRef(onSelectDocument);

  useEffect(() => {
    onSelectRef.current = onSelectDocument;
  }, [onSelectDocument]);

  // Select the first document, but only if nothing is selected yet
  useEffect(() => {
    if (selectedDocumentId === null && documents.length > 0) {
      onSelectRef.current(documents[0].id);
    }
  }, [documents, selectedDocumentId]);

  const term = search.trim().toLowerCase();

  const filteredDocuments = term
    ? documents.filter((doc) =>
        [doc.title, doc.file_name, formatCategory(doc.document_category)]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : documents;

  return (
    <aside
      aria-label="Documents"
      className="flex min-h-0 w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Documents</h2>

            {!isLoading && !isError && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                {term
                  ? `${filteredDocuments.length}/${documents.length}`
                  : documents.length}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh documents"
            title="Refresh"
            className={`rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed ${focusRing}`}
          >
            <Icon
              name="refresh"
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
          </button>
        </div>

        <div className="relative mt-3">
          <Icon
            name="search"
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            aria-label="Search documents"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-8 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#315bdc] focus:bg-white focus:ring-2 focus:ring-[#315bdc]/20"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 ${focusRing}`}
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {/* Loading */}
        {isLoading && (
          <div
            role="status"
            aria-busy="true"
            aria-label="Loading documents"
            className="space-y-1"
          >
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-3 p-2.5">
                <Bone className="h-9 w-9 shrink-0 rounded-lg" />

                <div className="flex-1">
                  <Bone className="h-3.5 w-3/4" />
                  <Bone className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div role="alert" className="px-3 py-8 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Icon name="alert" className="h-5 w-5" />
            </span>

            <p className="mt-3 text-sm font-semibold text-slate-800">
              Failed to load documents
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Check your connection and try again.
            </p>

            <button
              type="button"
              onClick={() => refetch()}
              className={`mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 ${focusRing}`}
            >
              <Icon name="refresh" className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && documents.length === 0 && (
          <div className="px-3 py-10 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Icon name="file" className="h-5 w-5" />
            </span>

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No documents found
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Uploaded documents will appear here.
            </p>
          </div>
        )}

        {/* No search results */}
        {!isLoading &&
          !isError &&
          documents.length > 0 &&
          filteredDocuments.length === 0 && (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No matching documents
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Nothing matches &ldquo;{search}&rdquo;.
              </p>

              <button
                type="button"
                onClick={() => setSearch("")}
                className={`mt-4 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 ${focusRing}`}
              >
                Clear search
              </button>
            </div>
          )}

        {/* Documents */}
        {!isLoading && !isError && filteredDocuments.length > 0 && (
          <ul className="space-y-1">
            {filteredDocuments.map((doc) => {
              const active = selectedDocumentId === doc.id;

              const fileType = getFileType(doc.file_name);
              const tileStyle =
                FILE_TYPE_STYLES[fileType] ??
                "bg-slate-100 text-slate-600 ring-slate-200";

              const status = STATUS[doc.status];
              const meta = [
                formatCategory(doc.document_category),
                formatDate(doc.created_at),
              ]
                .filter(Boolean)
                .join(" · ");

              // Documents that failed AI validation may not be searchable
              const notIndexed = doc.guardrail_passed !== true;

              return (
                <li key={doc.id} className="relative">
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#315bdc]"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectDocument(doc.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition ${focusRing} ${
                      active
                        ? "border-blue-100 bg-blue-50/70"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold tracking-wide ring-1 ring-inset ${tileStyle}`}
                    >
                      {fileType === "—" ? (
                        <Icon name="file" className="h-4 w-4" />
                      ) : (
                        fileType.slice(0, 4)
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`truncate text-sm ${
                            active
                              ? "font-semibold text-[#274dc4]"
                              : "font-medium text-slate-800"
                          }`}
                        >
                          {doc.title}
                        </span>

                        {notIndexed && (
                          <span
                            title="This document has not passed AI validation, so answers may be unavailable."
                            className="shrink-0 text-amber-500"
                          >
                            <Icon name="alert" className="h-3.5 w-3.5" />
                            <span className="sr-only">Not indexed</span>
                          </span>
                        )}
                      </span>

                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {doc.file_name}
                      </span>

                      <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                        {status && (
                          <span className="flex shrink-0 items-center gap-1 font-medium text-slate-500">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                            />
                            {status.label}
                          </span>
                        )}

                        {status && meta && <span aria-hidden="true">·</span>}

                        {meta && <span className="truncate">{meta}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}