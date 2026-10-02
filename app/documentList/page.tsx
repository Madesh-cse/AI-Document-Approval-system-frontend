"use client";

import { useMemo, useState } from "react";
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

  return labels[category];
}

function formatDate(date: string) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDocumentIdentifier(document: DocumentItem) {
  const data = document.extracted_data;

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

function getDocumentTitle(document: DocumentItem) {
  const identifier = getDocumentIdentifier(document);

  if (identifier) {
    return identifier;
  }

  return document.title || document.file_name;
}

function getDocumentAmount(document: DocumentItem) {
  const data = document.extracted_data;

  if (!data) {
    return null;
  }

  switch (document.document_category) {
    case "invoice":
      return {
        amount: data.total_amount,
        currency: data.currency,
      };

    case "purchase_order":
      return {
        amount: data.total_amount,
        currency: data.currency,
      };

    case "expense_report":
      return {
        amount: data.reimbursable_amount,
        currency: data.currency,
      };

    case "insurance_policy":
      return {
        amount: data.premium,
        currency: data.currency,
      };

    case "financial_statement":
      return {
        amount: data.net_income,
        currency: data.currency,
      };

    case "contract":
      return {
        amount: data.contract_value,
        currency: data.currency,
      };

    default:
      return null;
  }
}

function formatAmount(
  amount: unknown,
  currency: unknown,
) {
  if (typeof amount !== "number") {
    return "—";
  }

  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (typeof currency === "string" && currency.trim()) {
    return `${currency} ${amount.toLocaleString()}`;
  }

  return amount.toLocaleString();
}

function getUploadedBy(document: DocumentItem) {
  return `User #${document.uploaded_by}`;
}

function ValidationBadge({
  passed,
}: {
  passed: boolean | null;
}) {
  if (passed === true) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400">
          ✓
        </span>
        Passed
      </span>
    );
  }

  if (passed === false) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-red-400">
          ×
        </span>
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
      —
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: DocumentStatus;
}) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
        <span>✓</span>
        Approved
      </span>
    );
  }

  if (status === "pending_review") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
        <span>◷</span>
        Pending Approval
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-500">
        <span>×</span>
        Rejected
      </span>
    );
  }

  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
        <span>◷</span>
        Processing
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
      Draft
    </span>
  );
}

export default function DocumentsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const documents = data?.documents ?? [];

  const filteredDocuments = useMemo(() => {
    if (activeTab === "invoices") {
      return documents.filter(
        (document) =>
          document.document_category === "invoice",
      );
    }

    if (activeTab === "contracts") {
      return documents.filter(
        (document) =>
          document.document_category === "contract",
      );
    }

    if (activeTab === "processing") {
      return documents.filter(
        (document) =>
          document.status === "processing",
      );
    }

    return documents;
  }, [activeTab, documents]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main application */}
      <div className="lg:pl-62.5">
        {/* Header */}
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Content */}
        <main className="px-7 py-7">
          {/* Page heading */}
          <div className="mb-7 flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#111827]">
                Documents
              </h1>

              <p className="mt-1.5 text-sm text-[#64748b]">
                Every document ingested by DocIntel AI,
                with extraction and validation results.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#315bdc] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#274dc4]"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
              </svg>

              Upload Document
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#315bdc] border-t-transparent" />

              <p className="text-sm text-[#64748b]">
                Loading documents...
              </p>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm font-medium text-red-600">
                Failed to load documents.
              </p>

              <p className="mt-1 text-xs text-red-500">
                Please try again.
              </p>

              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Document table */}
          {!isLoading && !isError && (
            <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-[#e5e7eb] px-4 pt-3">
                {[
                  {
                    id: "all",
                    label: "All",
                  },
                  {
                    id: "invoices",
                    label: "Invoices",
                  },
                  {
                    id: "contracts",
                    label: "Contracts",
                  },
                  {
                    id: "processing",
                    label: "Processing",
                  },
                ].map((tab) => {
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setActiveTab(tab.id)
                      }
                      className={`rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                        active
                          ? "border border-b-white border-[#e5e7eb] bg-white text-[#315bdc]"
                          : "text-[#64748b] hover:text-[#111827]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-262.5 border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-[#fafbfc]">
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-[#64748b]">
                        Document
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-medium text-[#64748b]">
                        Type
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-medium text-[#64748b]">
                        Uploaded By
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-medium text-[#64748b]">
                        Date
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-medium text-[#64748b]">
                        Amount
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-medium text-[#64748b]">
                        AI Validation
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-medium text-[#64748b]">
                        Status
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-medium text-[#64748b]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredDocuments.map(
                      (document) => {
                        const amountInfo =
                          getDocumentAmount(
                            document,
                          );

                        return (
                          <tr
                            key={document.id}
                            className="border-b border-[#eef0f3] last:border-b-0 hover:bg-[#fafcff]"
                          >
                            {/* Document */}
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-medium text-[#111827]">
                                  {getDocumentTitle(
                                    document,
                                  )}
                                </p>

                                <p className="mt-0.5 text-xs text-[#94a3b8]">
                                  {document.file_name}
                                </p>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="px-4 py-4 text-sm text-[#475569]">
                              {formatCategory(
                                document.document_category,
                              )}
                            </td>

                            {/* Uploaded By */}
                            <td className="px-4 py-4 text-sm text-[#475569]">
                              {getUploadedBy(
                                document,
                              )}
                            </td>

                            {/* Date */}
                            <td className="px-4 py-4 text-sm text-[#475569]">
                              {formatDate(
                                document.created_at,
                              )}
                            </td>

                            {/* Amount */}
                            <td className="px-4 py-4 text-sm font-medium text-[#111827]">
                              {amountInfo
                                ? formatAmount(
                                    amountInfo.amount,
                                    amountInfo.currency,
                                  )
                                : "—"}
                            </td>

                            {/* AI Validation */}
                            <td className="px-4 py-4">
                              <ValidationBadge
                                passed={
                                  document.guardrail_passed
                                }
                              />
                            </td>

                            {/* Status */}
                            <td className="px-4 py-4">
                              <StatusBadge
                                status={
                                  document.status
                                }
                              />
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/documentList/${document.id}`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#315bdc]"
                              >
                                <svg
                                  width="17"
                                  height="17"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                >
                                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />

                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="2.5"
                                  />
                                </svg>

                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>

                {/* Empty */}
                {filteredDocuments.length === 0 && (
                  <div className="px-6 py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9]">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="1.8"
                      >
                        <path d="M6 2h9l3 3v17H6z" />

                        <path d="M14 2v4h4" />
                      </svg>
                    </div>

                    <p className="text-sm font-medium text-[#475569]">
                      No documents found
                    </p>

                    <p className="mt-1 text-xs text-[#94a3b8]">
                      There are no documents in this
                      category.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}