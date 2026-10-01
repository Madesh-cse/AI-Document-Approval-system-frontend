import { Icon } from "./Icon";

import type { DashboardStats as DashboardStatsData } from "@/services/dashboardService";

interface DashboardStatsProps {
  stats: DashboardStatsData;
}

type StatCard = {

  key: keyof DashboardStatsData;
  title: string;
  icon: string;
  caption: string;
  badgeClass?: string;
};

const STAT_CARDS: StatCard[] = [
  {
    key: "total_documents",
    title: "Total Documents",
    icon: "file",
    caption: "Processed all time",
  },
  {
    key: "pending_review",
    title: "Pending Approval",
    icon: "clock",
    caption: "Awaiting reviewer action",
    badgeClass: "bg-amber-50 text-amber-700",
  },
  {
    key: "approved",
    title: "Approved",
    icon: "check_circle",
    caption: "Cleared for payment",
    badgeClass: "bg-green-50 text-green-700",
  },
  {
    key: "rejected",
    title: "Rejected",
    icon: "x_circle",
    caption: "Returned to submitter",
    badgeClass: "bg-red-50 text-red-600",
  },
];

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const total = stats.total_documents;

  return (
    <section
      aria-label="Document statistics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {STAT_CARDS.map((card) => {
        const value = stats[card.key] ?? 0;

        // Share of all documents (used for the badge)
        const share = total > 0 ? Math.round((value / total) * 100) : 0;

        return (
          <div
            key={card.key}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                {card.title}
              </p>

              <Icon name={card.icon} className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-3 flex items-end justify-between gap-2">
              <p className="text-2xl font-bold text-slate-900">
                {formatCount(value)}
              </p>

              {card.badgeClass && (
                <span
                  title={`${share}% of all documents`}
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${card.badgeClass}`}
                >
                  {share}%
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500">{card.caption}</p>
          </div>
        );
      })}
    </section>
  );
}