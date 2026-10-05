"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/store/authStore";
import {
  formatRole,
  getInitials,
  getRoleBadgeClass,
} from "@/lib/userDisplay";

import { Icon } from "./Icon";
import UploadButton from "./UploadButton";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

type OpenMenu = "notifications" | "user" | null;

function toLabel(segment: string) {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function DashboardHeader({
  onMenuClick,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [shortcutKey, setShortcutKey] = useState("Ctrl");

  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fullName = user?.full_name || "User";
  const role = user?.role || "employee";
  const email = (user as { email?: string } | null)?.email;

  const initials = getInitials(fullName);
  const displayRole = formatRole(role);

  const crumbs = (pathname ?? "")
    .split("/")
    .filter((segment) => segment && !/^\d+$/.test(segment))
    .map(toLabel);

  useEffect(() => {
    if (navigator.userAgent.includes("Mac")) {
      setShortcutKey("⌘");
    }
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const navigate = (path: string) => {
    setOpenMenu(null);
    router.push(path);
  };

  const handleLogout = () => {
    setOpenMenu(null);
    logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      {/* Left */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        {crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="hidden items-center gap-2 text-sm lg:flex"
          >
            {crumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span className="text-slate-300">/</span>}

                <span
                  className={
                    index === crumbs.length - 1
                      ? "font-semibold text-slate-900"
                      : "text-slate-500"
                  }
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        )}

        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 md:flex lg:ml-4">
          <Icon name="search" className="h-4 w-4 text-slate-400" />

          <input
            ref={searchRef}
            type="text"
            placeholder="Search documents..."
            aria-label="Search documents"
            className="w-56 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />

          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            {shortcutKey} K
          </kbd>
        </div>
      </div>

      {/* Right */}
      <div ref={menuRef} className="flex items-center gap-2 sm:gap-3">
        <UploadButton />

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("notifications")}
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={openMenu === "notifications"}
            className={`rounded-lg p-2 transition-colors hover:bg-slate-100 ${
              openMenu === "notifications" ? "bg-slate-100" : ""
            }`}
          >
            <Icon name="bell" className="h-5 w-5 text-slate-600" />
          </button>

          {openMenu === "notifications" && (
            <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  Notifications
                </p>
              </div>

              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Icon name="bell" className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm font-medium text-slate-600">
                  You&apos;re all caught up
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  New approvals and document updates will appear here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("user")}
            aria-haspopup="menu"
            aria-expanded={openMenu === "user"}
            className={`flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 ${
              openMenu === "user" ? "bg-slate-100" : ""
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initials}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">
                {fullName}
              </p>

              <p className="text-xs leading-tight text-slate-500">
                {displayRole}
              </p>
            </div>

            <svg
              className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                openMenu === "user" ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {openMenu === "user" && (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {fullName}
                    </p>

                    {email && (
                      <p className="truncate text-xs text-slate-500">
                        {email}
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={`mt-3 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(
                    role,
                  )}`}
                >
                  {displayRole}
                </span>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => navigate("/dashboard/profile")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Icon name="person" className="h-4 w-4 text-slate-500" />
                  Profile
                </button>
              </div>

              <div className="border-t border-slate-100 p-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <Icon name="logout" className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}