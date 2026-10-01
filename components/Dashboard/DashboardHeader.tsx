"use client";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/authStore";

import { Icon } from "./Icon";
import UploadButton from "./UploadButton";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export default function DashboardHeader({
  onMenuClick,
}: DashboardHeaderProps) {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const fullName = user?.full_name || "User";
  const role = user?.role || "employee";

  const initials = fullName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const displayRole =
    role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 md:flex">
          <Icon
            name="search"
            className="h-4 w-4 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search documents..."
            className="w-56 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <UploadButton />

        <button className="rounded-lg p-2 hover:bg-slate-100">
          <Icon
            name="bell"
            className="h-5 w-5 text-slate-600"
          />
        </button>

        <div className="group relative">
          <button className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {initials}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {fullName}
              </p>

              <p className="text-xs capitalize text-slate-500">
                {displayRole}
              </p>
            </div>
          </button>

          <div className="invisible absolute right-0 top-full mt-2 w-48 translate-y-1 rounded-xl border border-slate-200 bg-white p-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={() => router.push("/profile")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Icon name="person" className="h-4 w-4" />
              Profile
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Icon name="logout" className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}