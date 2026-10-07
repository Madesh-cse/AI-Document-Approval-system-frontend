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