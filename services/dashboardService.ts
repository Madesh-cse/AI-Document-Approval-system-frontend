import api from "@/lib/axios";

export interface DashboardStats {
  total_documents: number;
  pending_review: number;
  approved: number;
  rejected: number;
}

export interface DashboardLifecycle {
  draft: number;
  processing: number;
  pending_review: number;
  approved: number;
  rejected: number;
}

export interface RecentDocument {
  id: number;
  title: string;
  file_name: string;
  status:
    | "draft"
    | "processing"
    | "pending_review"
    | "approved"
    | "rejected";
  created_at: string;
}

export interface DashboardData {
  stats: DashboardStats;
  lifecycle: DashboardLifecycle;
  recent_documents: RecentDocument[];
}

export async function getDashboard(): Promise<DashboardData> {
  const response = await api.get<DashboardData>("/dashboard");

  return response.data;
}