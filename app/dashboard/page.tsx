"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import DashboardStats from "@/components/Dashboard/DashboardStats";
import DocumentLifecycle from "@/components/Dashboard/DocumentLifecycle";
import RecentDocuments from "@/components/Dashboard/RecentDocuments";

import {
  DashboardData,
  getDashboard,
} from "@/services/dashboardService";

import {
  getDocuments,
  getAllReviewDocuments,
  DocumentItem,
} from "@/services/documentService";

import { useAuthStore } from "@/store/authStore";

export default function DashboardPage() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isReviewer =
    user?.role === "manager" ||
    user?.role === "admin";

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [dashboardData, documentData] =
          await Promise.all([
            getDashboard(),
            isReviewer
              ? getAllReviewDocuments()
              : getDocuments(),
          ]);

        setDashboard(dashboardData);
        setDocuments(documentData.documents);
      } catch (error) {
        console.error(
          "Failed to load dashboard:",
          error,
        );

        setError(
          "Unable to load dashboard data. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user, isReviewer]);

  const recentDocuments = documents.map((document) => ({
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
          <DashboardHeader
            onMenuClick={() => setSidebarOpen(true)}
          />

          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-[1600px]">
              {loading && (
                <div className="flex min-h-40 items-center justify-center">
                  <p className="text-sm text-slate-500">
                    Loading dashboard...
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {!loading && !error && dashboard && (
                <>
                  <DashboardStats
                    stats={dashboard.stats}
                  />

                  <div className="mt-6">
                    <DocumentLifecycle
                      lifecycle={dashboard.lifecycle}
                    />
                  </div>

                  <div className="mt-6">
                    <RecentDocuments
                      documents={recentDocuments}
                      onReview={(document) => {
                        router.push(
                          `/dashboard/documents/${document.id}`,
                        );
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}