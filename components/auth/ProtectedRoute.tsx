"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const router = useRouter();

  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const restoreSession = useAuthStore(
    (state) => state.restoreSession,
  );

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    restoreSession();
    setChecking(false);
  }, [restoreSession]);

  useEffect(() => {
    if (!checking && !isAuthenticated) {
      router.replace("/login");
    }
  }, [checking, isAuthenticated, router]);

  if (checking || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-sm text-slate-500">
          Verifying your session...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}