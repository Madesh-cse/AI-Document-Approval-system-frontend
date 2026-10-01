import api from "@/lib/axios";

export interface DocumentResponse {
  id: number;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status:
    | "draft"
    | "processing"
    | "pending_review"
    | "approved"
    | "rejected";
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
  total: number;
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