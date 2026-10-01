"use client";

import { useState } from "react";

import DashboardHeader from "../Dashboard/DashboardHeader";
import DashboardSidebar from "../Dashboard/DashboardSidebar";

import DocumentList from "./DocumentList";
import ChatAssistant from "./ChatAssistant";

export default function DocumentQA() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-800">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-62.5">
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
          <div className="mb-5 shrink-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Ask your documents
            </h1>

            <p className="mt-0.5 text-sm text-slate-500">
              Answers are generated only from documents you have access
              to, with citations.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 gap-5">
            <DocumentList
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={setSelectedDocumentId}
            />

            <ChatAssistant
              selectedDocumentId={selectedDocumentId}
            />
          </div>
        </main>
      </div>
    </div>
  );
}