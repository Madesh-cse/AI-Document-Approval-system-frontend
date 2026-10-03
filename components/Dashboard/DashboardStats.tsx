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
  iconClass: string;
};

const STAT_CARDS: StatCard[] = [
  {
    key: "total_documents",
    title: "Total Documents",
    icon: "file",
    caption: "Processed all time",
    iconClass: "bg-slate-100 text-slate-600",
  },
  {
    key: "pending_review",
    title: "Pending Approval",
    icon: "clock",
    caption: "Awaiting reviewer action",
    iconClass: "bg-amber-50 text-amber-700",
  },
  {
    key: "approved",
    title: "Approved",
    icon: "check_circle",
    caption: "Cleared for payment",
    iconClass: "bg-green-50 text-green-700",
  },
  {
    key: "rejected",
    title: "Rejected",
    icon: "x_circle",
    caption: "Returned to submitter",
    iconClass: "bg-red-50 text-red-600",
  },
];

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

export default function DashboardStats({
  stats,
}: DashboardStatsProps) {
  return (
    <section
      aria-label="Document statistics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {STAT_CARDS.map((card) => {
        const value = Number(stats[card.key] ?? 0);

        return (
          <div
            key={card.key}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                {card.title}
              </p>

              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconClass}`}
              >
                <Icon
                  name={card.icon}
                  className="h-5 w-5"
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">
                {formatCount(value)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {card.caption}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}