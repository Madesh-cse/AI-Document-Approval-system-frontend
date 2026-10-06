"use client";

import { ReactNode, useState } from "react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 scheme:light">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="lg:pl-62.5">
          <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}