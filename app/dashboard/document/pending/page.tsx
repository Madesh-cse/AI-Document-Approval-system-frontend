"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import { Icon } from "@/components/Dashboard/Icon";
import {
  getPendingReviewDocuments,
  DocumentItem,
} from "@/services/documentService";
import { useAuthStore } from "@/store/authStore";

export default function PendingReviewPage() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isReviewer =
    user?.role === "manager" || user?.role === "admin";

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["documents", "pending-review"],
    queryFn: getPendingReviewDocuments,
    enabled: isReviewer,
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8fafc]">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="lg:pl-62.5">
          <DashboardHeader
            onMenuClick={() => setSidebarOpen(true)}
          />

          <main className="p-6">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">
                  Pending Review
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Review documents submitted for approval.
                </p>
              </div>

              {!isReviewer ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    You do not have permission to review documents.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm text-slate-500">
                    Loading pending documents...
                  </p>
                </div>
              ) : isError ? (
                <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
                  <p className="text-sm font-medium text-red-600">
                    Failed to load pending documents.
                  </p>

                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Try again
                  </button>
                </div>
              ) : !data?.documents.length ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Icon
                      name="check_circle"
                      className="h-6 w-6 text-slate-500"
                    />
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-slate-900">
                    No pending documents
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    There are currently no documents waiting for review.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-slate-900">
                          Documents awaiting approval
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {data.total} document
                          {data.total === 1 ? "" : "s"} pending review
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {data.documents.map((document) => (
                      <PendingDocumentRow
                        key={document.id}
                        document={document}
                        onClick={() =>
                          router.push(
                            `/documentList/${document.id}`,
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

interface PendingDocumentRowProps {
  document: DocumentItem;
  onClick: () => void;
}

function PendingDocumentRow({
  document,
  onClick,
}: PendingDocumentRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Icon
            name="description"
            className="h-5 w-5 text-slate-600"
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {document.title}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {document.file_name}
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <div className="text-right">
          <p className="text-xs text-slate-400">
            Category
          </p>

          <p className="mt-1 text-sm font-medium capitalize text-slate-700">
            {document.document_category?.replaceAll("_", " ") || "Unknown"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-400">
            Confidence
          </p>

          <p className="mt-1 text-sm font-medium capitalize text-slate-700">
            {document.classification_confidence || "N/A"}
          </p>
        </div>

        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          Pending Review
        </span>

        <Icon
          name="chevron_right"
          className="h-5 w-5 text-slate-400"
        />
      </div>
    </button>
  );
}