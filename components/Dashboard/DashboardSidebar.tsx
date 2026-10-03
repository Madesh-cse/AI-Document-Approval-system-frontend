"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/store/authStore";

import { Icon } from "./Icon";
import { NAV } from "./dashboard-data";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function DashboardSidebar({
  open,
  onClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const user = useAuthStore((state) => state.user);

  const canReviewDocuments =
    user?.role === "admin" || user?.role === "manager";

  const navigationItems = NAV.filter((item) => {
    if (item.href === "/dashboard/documents/pending") {
      return canReviewDocuments;
    }

    return true;
  });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-62.5 border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-slate-200 px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                <Icon
                  name="shield_check"
                  className="h-5 w-5 text-white"
                />
              </div>

              <span className="text-lg font-bold text-slate-900">
                DocFlow AI
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navigationItems.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      name={item.icon}
                      className="h-4.5 w-4.5"
                    />

                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {user?.full_name
                  ?.slice(0, 2)
                  .toUpperCase() || "US"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user?.full_name || "User"}
                </p>

                <p className="text-xs capitalize text-slate-500">
                  {user?.role || "employee"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}