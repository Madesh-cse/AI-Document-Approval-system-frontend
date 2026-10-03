"use client";

import { useState } from "react";
import axios from "axios";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardSidebar from "@/components/Dashboard/DashboardSidebar";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import { Icon } from "@/components/Dashboard/Icon";

import {
  uploadDocument,
  processDocument,
} from "@/services/documentService";

const TIMELINE_STEPS = [
  {
    title: "Document Uploaded",
    description: "File received and stored securely",
  },
  {
    title: "Text Extraction",
    description: "OCR pass over every page",
  },
  {
    title: "AI Information Extraction",
    description: "Structured fields identified",
  },
  {
    title: "Validation",
    description: "Totals, tax and required fields checked",
  },
  {
    title: "Approval Preparation",
    description: "Routed to the approval queue",
  },
];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export default function UploadDocumentPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);

  const [processing, setProcessing] = useState(false);

  const [completed, setCompleted] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const handleFile = async (file: File) => {
    setError("");
    setSuccessMessage("");
    setCompleted(false);
    setCurrentStep(0);

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Please upload a PDF, JPG, or PNG file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 20 MB.");
      return;
    }

    setSelectedFile(file);
    setProcessing(true);

    try {
      setCurrentStep(0);

      const document = await uploadDocument(file);

      console.log("Uploaded document:", document);

      setCurrentStep(1);

      const result = await processDocument(document.id);

      console.log("Document processing result:", result);

      if (result.status === "rejected") {
        const guardrailMessage =
          result.guardrail_errors?.length > 0
            ? result.guardrail_errors.join(", ")
            : result.reason || "Document processing was rejected.";

        throw new Error(guardrailMessage);
      }

      if (!result.indexed) {
        throw new Error(
          "Document processing completed, but the document was not indexed for AI search.",
        );
      }

      setCurrentStep(4);

      setSuccessMessage(
        "Document processed successfully and sent for approval.",
      );

      setProcessing(false);
      setCompleted(true);
    } catch (error) {
      console.error("Document processing failed:", error);

      setProcessing(false);
      setCompleted(false);
      setCurrentStep(0);

      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (typeof detail === "string") {
          setError(detail);
          return;
        }

        if (Array.isArray(detail)) {
          setError(
            detail
              .map((item) => item.msg)
              .filter(Boolean)
              .join(", "),
          );
          return;
        }
      }

      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError(
        "Unable to process the document. Please try again.",
      );
    }
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void handleFile(file);
    }
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
  };

  const handleDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
  };

  const handleBrowse = () => {
    const input = document.getElementById(
      "file-input",
    ) as HTMLInputElement | null;

    input?.click();
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      void handleFile(file);
    }

    event.target.value = "";
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-[#f8fafc] font-[Inter,sans-serif] text-slate-800 antialiased">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex min-h-screen flex-1 flex-col lg:pl-62.5">
          <DashboardHeader
            onMenuClick={() => setSidebarOpen(true)}
          />

          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
            <section>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Upload Document
              </h1>

              <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
                Add a business document and DocIntel AI will
                extract, validate and route it.
              </p>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {successMessage}
              </div>
            )}

            <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
              <div className="p-6 md:p-8">
                <div
                  id="dropzone"
                  onClick={handleBrowse}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${
                    isDragging
                      ? "border-[#2563eb] bg-blue-50/30"
                      : "border-slate-200 bg-white hover:border-[#60a5fa] hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="sr-only"
                    onChange={handleInputChange}
                    disabled={processing}
                  />

                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#2563eb] transition-transform duration-200 group-hover:scale-105">
                    <Icon
                      name="upload"
                      className="h-8 w-8"
                      strokeWidth={1.8}
                    />
                  </div>

                  <h2 className="text-base font-semibold text-slate-800 sm:text-lg">
                    {selectedFile
                      ? selectedFile.name
                      : "Upload your document"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedFile
                      ? `${(
                          selectedFile.size /
                          (1024 * 1024)
                        ).toFixed(2)} MB`
                      : "Drag and drop your PDF, JPG, or PNG here"}
                  </p>

                  {!selectedFile && (
                    <div className="mt-4">
                      <span className="inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 group-hover:border-slate-300">
                        or Browse Files
                      </span>
                    </div>
                  )}

                  {selectedFile && (
                    <div className="mt-3 text-xs font-medium text-[#2563eb]">
                      {processing
                        ? `Processing: ${selectedFile.name}`
                        : completed
                          ? `Processed successfully: ${selectedFile.name}`
                          : selectedFile.name}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col items-center justify-between gap-2 px-1 text-xs text-slate-400 sm:flex-row">
                  <span>
                    Supported formats: PDF, JPG, PNG
                  </span>

                  <span>Maximum file size: 20 MB</span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                  Processing timeline
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Steps run automatically after upload.
                </p>
              </div>

              <div className="relative flex flex-col space-y-6">
                <div
                  aria-hidden="true"
                  className="absolute bottom-2 left-4.5 top-8 z-0 w-px bg-slate-200"
                />

                {TIMELINE_STEPS.map((step, index) => {
                  const isComplete =
                    completed || currentStep > index;

                  const isActive =
                    processing && currentStep === index;

                  return (
                    <div
                      key={step.title}
                      className="relative z-10 flex items-start gap-4"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                          isComplete
                            ? "border-[#2563eb] bg-[#2563eb] text-white shadow-sm"
                            : isActive
                              ? "border-[#2563eb] bg-[#2563eb] text-white shadow-sm"
                              : "border-slate-300 bg-white text-slate-500"
                        }`}
                      >
                        {isComplete ? (
                          <Icon
                            name="check_circle"
                            className="h-5 w-5"
                            strokeWidth={2}
                          />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div className="pt-1">
                        <h3
                          className={`text-sm font-semibold leading-snug ${
                            isComplete || isActive
                              ? "text-slate-900"
                              : "text-slate-700"
                          }`}
                        >
                          {step.title}
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}