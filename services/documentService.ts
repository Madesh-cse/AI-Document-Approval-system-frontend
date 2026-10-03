import api from "@/lib/axios";

export type DocumentStatus =
  | "draft"
  | "processing"
  | "pending_review"
  | "approved"
  | "rejected";

export type DocumentCategory =
  | "invoice"
  | "insurance_policy"
  | "purchase_order"
  | "expense_report"
  | "financial_statement"
  | "contract"
  | "unsupported";

export interface DocumentResponse {
  id: number;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;

  status: DocumentStatus;

  document_category: DocumentCategory | null;

  classification_confidence: string | null;
  classification_reason: string | null;

  extracted_data: Record<string, unknown> | null;

  guardrail_passed: boolean | null;
  guardrail_errors: string[] | null;

  processing_error: string | null;

  uploaded_by: number;

  created_at: string;
  updated_at: string;
}

export type DocumentItem = DocumentResponse;

export interface DocumentListResponse {
  documents: DocumentItem[];
  total: number;
}

export interface DocumentProcessingResponse {
  document_id: number;

  status: DocumentStatus;

  category: DocumentCategory;
  confidence: string;
  reason: string;

  extraction: Record<string, unknown> | null;

  guardrail_passed: boolean;
  guardrail_errors: string[];

  indexed: boolean;
}

export interface DocumentQASource {
  document_id: number;
  page: number | null;
}

export interface DocumentQAResponse {
  answer: string;
  sources: DocumentQASource[];
}

export interface DocumentQARequest {
  question: string;
}

export async function uploadDocument(
  file: File,
  title?: string,
): Promise<DocumentResponse> {
  const formData = new FormData();

  formData.append("file", file);

  if (title?.trim()) {
    formData.append("title", title.trim());
  }

  const response = await api.post<DocumentResponse>(
    "/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function getDocuments(): Promise<DocumentListResponse> {
  const response = await api.get<DocumentListResponse>(
    "/documents",
  );

  return response.data;
}

export async function getDocument(
  documentId: number,
): Promise<DocumentResponse> {
  const response = await api.get<DocumentResponse>(
    `/documents/${documentId}`,
  );

  return response.data;
}

export async function processDocument(
  documentId: number,
): Promise<DocumentProcessingResponse> {
  const response = await api.post<DocumentProcessingResponse>(
    `/documents/${documentId}/process`,
  );

  return response.data;
}

export async function askDocumentQuestion(
  documentId: number,
  question: string,
): Promise<DocumentQAResponse> {
  const response = await api.post<DocumentQAResponse>(
    `/documents/${documentId}/qa`,
    {
      question,
    },
  );

  return response.data;
}

export async function approveDocument(
  documentId: number,
): Promise<DocumentResponse> {
  const response = await api.post<DocumentResponse>(
    `/documents/${documentId}/approve`,
  );

  return response.data;
}

export async function rejectDocument(
  documentId: number,
): Promise<DocumentResponse> {
  const response = await api.post<DocumentResponse>(
    `/documents/${documentId}/reject`,
  );

  return response.data;
}

export async function getPendingReviewDocuments(): Promise<DocumentListResponse> {
  const response = await api.get<DocumentListResponse>(
    "/documents/review/pending",
  );

  return response.data;
}

export async function getAllReviewDocuments(): Promise<DocumentListResponse> {
  const response = await api.get<DocumentListResponse>(
    "/documents/review/all",
  );

  return response.data;
}

export async function getDocumentFile(documentId: number): Promise<Blob> {
  const response = await api.get<Blob>(
    `/documents/${documentId}/file`,
    {
      responseType: "blob",
    },
  );

  return response.data;
}