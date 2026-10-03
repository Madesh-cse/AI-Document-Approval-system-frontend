"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import RecentDocuments from "@/components/Dashboard/RecentDocuments";
import { getApprovedDocuments, DocumentItem } from "@/services/documentService";
import { useAuthStore } from "@/store/authStore";

export default function ApprovedDocumentsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadApprovedDocuments = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getApprovedDocuments();

        setDocuments(response.documents);
      } catch (error) {
        console.error("Failed to load approved documents:", error);
        setError("Unable to load approved documents. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadApprovedDocuments();
  }, [user]);

  const approvedDocuments = documents.map((document) => ({
    id: document.id,
    title: document.title,
    file_name: document.file_name,
    status: document.status,
    created_at: document.created_at,
  }));

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8fafc]">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="lg:pl-62.5">
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">
                Approved Documents
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                View documents that have been approved.
              </p>
            </div>

            {loading && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">
                  Loading approved documents...
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <RecentDocuments
                documents={approvedDocuments}
                onReview={(document) =>
                  router.push(`/documentList/${document.id}`)
                }
              />
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
