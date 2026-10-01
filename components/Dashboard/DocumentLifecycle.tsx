import { Icon } from "./Icon";
import type { DashboardLifecycle } from "@/services/dashboardService";

interface DocumentLifecycleProps {
  lifecycle: DashboardLifecycle;
}

type Step = {
  key: keyof DashboardLifecycle;
  label: string;
  icon: string;
  activeClass: string;
};

const STEPS: Step[] = [
  {
    key: "draft",
    label: "Draft",
    icon: "file",
    activeClass: "bg-slate-200 text-slate-700",
  },
  {
    key: "processing",
    label: "Processing",
    icon: "loader",
    activeClass: "bg-blue-100 text-blue-600",
  },
  {
    key: "pending_review",
    label: "Pending Review",
    icon: "clock",
    activeClass: "bg-amber-100 text-amber-600",
  },
  {
    key: "approved",
    label: "Approved",
    icon: "check_circle",
    activeClass: "bg-green-100 text-green-600",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: "x_circle",
    activeClass: "bg-red-100 text-red-600",
  },
];

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

export default function DocumentLifecycle({
  lifecycle,
}: DocumentLifecycleProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">
          Document Lifecycle
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Track documents through the processing workflow.
        </p>
      </div>

      <ol className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {STEPS.map((step, index) => {
          const count = lifecycle[step.key] ?? 0;
          const hasDocuments = count > 0;

          const isLast = index === STEPS.length - 1;

          // Review ends in either "Approved" or "Rejected", so use "or" there
          const isBeforeLast = index === STEPS.length - 2;

          return (
            <li key={step.key} className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  hasDocuments
                    ? step.activeClass
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                <Icon name={step.icon} className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900">
                  {step.label}
                </p>

                <p className="text-xs text-slate-500">
                  {formatCount(count)}{" "}
                  {count === 1 ? "document" : "documents"}
                </p>
              </div>

              {!isLast &&
                (isBeforeLast ? (
                  <span
                    aria-hidden="true"
                    className="mx-4 hidden text-xs font-medium uppercase text-slate-400 md:block"
                  >
                    or
                  </span>
                ) : (
                  <Icon
                    name="arrow_right"
                    className="mx-4 hidden h-4 w-4 text-slate-300 md:block"
                  />
                ))}
            </li>
          );
        })}
      </ol>
    </section>
  );
}