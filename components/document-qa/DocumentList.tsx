"use client";

import { useEffect, useState } from "react";

import { Icon } from "../Dashboard/Icon";
import {
  DocumentResponse,
  getDocuments,
} from "@/services/documentService";

interface DocumentListProps {
  selectedDocumentId: number | null;
  onSelectDocument: (documentId: number) => void;
}

export default function DocumentList({
  selectedDocumentId,
  onSelectDocument,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getDocuments();

        setDocuments(response.documents);

        if (response.documents.length > 0) {
          onSelectDocument(response.documents[0].id);
        }
      } catch (error) {
        console.error("Failed to load documents:", error);
        setError("Failed to load documents.");
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [onSelectDocument]);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1 px-2 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Documents
        </span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {loading && (
          <div className="px-2 py-4 text-sm text-slate-400">
            Loading documents...
          </div>
        )}

        {!loading && error && (
          <div className="px-2 py-4 text-sm text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="px-2 py-4 text-sm text-slate-400">
            No documents found.
          </div>
        )}

        {!loading &&
          !error &&
          documents.map((document) => {
            const active =
              selectedDocumentId === document.id;

            return (
              <button
                key={document.id}
                type="button"
                onClick={() =>
                  onSelectDocument(document.id)
                }
                className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition ${
                  active
                    ? "border-blue-100 bg-blue-50/80"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                <Icon
                  name="file"
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    active
                      ? "text-blue-600"
                      : "text-slate-400"
                  }`}
                />

                <div className="min-w-0">
                  <div
                    className={`truncate text-sm ${
                      active
                        ? "font-semibold text-blue-700"
                        : "font-medium text-slate-800"
                    }`}
                  >
                    {document.title}
                  </div>

                  <div className="truncate text-xs text-slate-500">
                    {document.file_name}
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}