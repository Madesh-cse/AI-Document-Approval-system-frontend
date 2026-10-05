import api from "@/lib/axios";

export interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  document: string | null;
  status: string;
  error_message: string | null;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  total: number;
}

export async function getAuditLogs(): Promise<AuditLogListResponse> {
  const response = await api.get<AuditLogListResponse>(
    "/audit-logs",
  );

  return response.data;
}