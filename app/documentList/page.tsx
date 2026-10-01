"use client";

import { useMemo, useState } from "react";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";

type DocumentStatus =
  | "draft"
  | "processing"
  | "pending_review"
  | "approved"
  | "rejected";

type DocumentCategory =
  | "invoice"
  | "insurance_policy"
  | "purchase_order"
  | "expense_report"
  | "financial_statement"
  | "contract"
  | "unsupported";

interface DocumentItem {
  id: number;
  title: string;
  file_name: string;
  category: DocumentCategory;
  uploaded_by: string;
  date: string;
  amount?: number;
  currency?: string;
  guardrail_passed?: boolean;
  status: DocumentStatus;
}

const documents: DocumentItem[] = [
  {
    id: 3,
    title: "Invoice INV-2026-0587",
    file_name: "invoice_0587.pdf",
    category: "invoice",
    uploaded_by: "Madesh",
    date: "Sep 25, 2026",
    amount: 153400,
    currency: "INR",
    guardrail_passed: true,
    status: "pending_review",
  },
  {
    id: 2,
    title: "Purchase Order PO-3391",
    file_name: "purchase_order_3391.pdf",
    category: "purchase_order",
    uploaded_by: "Madesh",
    date: "Sep 24, 2026",
    amount: 212000,
    currency: "INR",
    guardrail_passed: true,
    status: "processing",
  },
  {
    id: 4,
    title: "Contract CNT-221",
    file_name: "contract_221.pdf",
    category: "contract",
    uploaded_by: "Priya",
    date: "Sep 21, 2026",
    guardrail_passed: false,
    status: "rejected",
  },
  {
    id: 5,
    title: "Invoice INV-1023",
    file_name: "invoice_1023.pdf",
    category: "invoice",
    uploaded_by: "Arun",
    date: "Sep 22, 2026",
    amount: 75500,
    currency: "INR",
    guardrail_passed: true,
    status: "approved",
  },
];

const formatCategory = (category: DocumentCategory) => {
  const labels: Record<DocumentCategory, string> = {
    invoice: "Invoice",
    insurance_policy: "Insurance Policy",
    purchase_order: "Purchase Order",
    expense_report: "Expense Report",
    financial_statement: "Financial Statement",
    contract: "Contract",
    unsupported: "Unsupported",
  };

  return labels[category];
};

const formatAmount = (
  amount?: number,
  currency?: string,
) => {
  if (amount === undefined) {
    return "—";
  }

  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  return `${currency ?? ""} ${amount.toLocaleString()}`;
};

function ValidationBadge({
  passed,
}: {
  passed?: boolean;
}) {
  if (passed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400">
          ✓
        </span>
        Passed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-400">
        !
      </span>
      Review Required
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
  const [activeTab, setActiveTab] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredDocuments = useMemo(() => {
    if (activeTab === "invoices") {
      return documents.filter(
        (document) => document.category === "invoice",
      );
    }

    if (activeTab === "contracts") {
      return documents.filter(
        (document) => document.category === "contract",
      );
    }

    if (activeTab === "processing") {
      return documents.filter(
        (document) => document.status === "processing",
      );
    }

    return documents;
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-62.5">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        {/* Documents Content */}
        <main className="px-7 py-7">
          {/* Page heading */}
          <div className="mb-7 flex items-start justify-between">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-[#111827]">
                Documents
              </h1>

              <p className="mt-1.5 text-sm text-[#64748b]">
                Every document ingested by DocIntel AI, with extraction and
                validation results.
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

          {/* Document table card */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[#e5e7eb] px-4 pt-3">
              {[
                { id: "all", label: "All" },
                { id: "invoices", label: "Invoices" },
                { id: "contracts", label: "Contracts" },
                { id: "processing", label: "Processing" },
              ].map((tab) => {
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
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
                  {filteredDocuments.map((document) => (
                    <tr
                      key={document.id}
                      className="border-b border-[#eef0f3] last:border-b-0 hover:bg-[#fafcff]"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-[#111827]">
                            {document.title}
                          </p>

                          <p className="mt-0.5 text-xs text-[#94a3b8]">
                            {document.file_name}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-[#475569]">
                        {formatCategory(document.category)}
                      </td>

                      <td className="px-4 py-4 text-sm text-[#475569]">
                        {document.uploaded_by}
                      </td>

                      <td className="px-4 py-4 text-sm text-[#475569]">
                        {document.date}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-[#111827]">
                        {formatAmount(
                          document.amount,
                          document.currency,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <ValidationBadge
                          passed={document.guardrail_passed}
                        />
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={document.status} />
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
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
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>

                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredDocuments.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm font-medium text-[#475569]">
                    No documents found
                  </p>

                  <p className="mt-1 text-xs text-[#94a3b8]">
                    There are no documents in this category.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}