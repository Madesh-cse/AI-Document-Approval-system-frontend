"use client";

import { useState } from "react";

import { Icon } from "./Icon";
import type { RecentDocument } from "@/services/dashboardService";

interface RecentDocumentsProps {
  documents: RecentDocument[];
  /** Called when the eye / review button of a row is clicked */
  onReview?: (document: RecentDocument) => void;
}

type StatusStyle = {
  label: string;
  icon: string;
  className: string;
};

const STATUS: Record<RecentDocument["status"], StatusStyle> = {
  draft: {
    label: "Draft",
    icon: "file",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
  processing: {
    label: "Processing",
    icon: "loader",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  pending_review: {
    label: "Pending Review",
    icon: "clock",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Approved",
    icon: "check_circle",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  rejected: {
    label: "Rejected",
    icon: "x_circle",
    className: "border-red-200 bg-red-50 text-red-600",
  },
};

// Fallback if the API ever returns a status we don't know yet
const getStatus = (status: string): StatusStyle =>
  STATUS[status as RecentDocument["status"]] ?? {
    label: status.replace(/_/g, " "),
    icon: "file",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };

// "invoice_1024.pdf" -> "PDF"
const getFileType = (fileName: string) => {
  const dot = fileName.lastIndexOf(".");

  return dot > -1 && dot < fileName.length - 1
    ? fileName.slice(dot + 1).toUpperCase()
    : "—";
};

// "2026-09-23T10:15:00Z" -> "Sep 23, 2026"
const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function StatusBadge({ status }: { status: string }) {
  const { label, icon, className } = getStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon
        name={icon}
        className={`h-3.5 w-3.5 ${icon === "loader" ? "animate-spin motion-reduce:animate-none" : ""}`}
      />
      {label}
    </span>
  );
}

export default function RecentDocuments({
  documents,
  onReview,
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
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Recent Documents
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Recently uploaded and processed documents.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <Icon name="search" className="h-4 w-4 text-slate-400" />

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            aria-label="Search recent documents"
            className="w-full bg-transparent text-sm outline-none sm:w-48"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-160">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Document
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Type
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Uploaded
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Status
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredDocuments.map((document) => (
              <tr
                key={document.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {document.title}
                  </p>

                  <p className="mt-0.5 break-all text-xs text-slate-500">
                    {document.file_name}
                  </p>
                </td>

                <td className="px-5 py-4 text-sm text-slate-600">
                  {getFileType(document.file_name)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                  {formatDate(document.created_at)}
                </td>

                <td className="px-5 py-4">
                  <StatusBadge status={document.status} />
                </td>

                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onReview?.(document)}
                    aria-label={`Review ${document.title}`}
                    className="rounded-lg p-2 hover:bg-slate-100"
                  >
                    <Icon name="eye" className="h-4 w-4 text-slate-500" />
                  </button>
                </td>
              </tr>
            ))}

            {filteredDocuments.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-sm text-slate-500"
                >
                  {documents.length === 0
                    ? "No documents uploaded yet."
                    : `No documents match "${query}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}