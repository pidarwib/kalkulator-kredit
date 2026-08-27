"use client";

import React from "react";
import { Menu, Building2, User, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-provider";

interface TopbarProps {
  onOpenSidebar?: () => void;
  organizationName?: string;
  userName?: string;
  userRole?: string;
  className?: string;
}

export function Topbar({
  onOpenSidebar,
  organizationName,
  userName,
  userRole,
  className,
}: TopbarProps) {
  const { user, logout } = useAuth();

  const displayOrg = organizationName || user?.bprName || "BPR Core System - Kantor Pusat";
  const displayName = userName || user?.fullName || "User System";
  const displayRole = userRole || user?.role || "STAFF";

  return (
    <header
      data-testid="app-topbar"
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6",
        className
      )}
    >
      {/* Left side: Mobile menu toggle & Organization context */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={onOpenSidebar}
          aria-label="Buka menu navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 font-medium">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span className="truncate max-w-[200px] md:max-w-[320px]">
              {displayOrg}
            </span>
          </span>
          <span className="inline-flex sm:hidden items-center gap-1 text-slate-700 font-medium">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span className="truncate max-w-[150px]">BPR Core</span>
          </span>
        </div>
      </div>

      {/* Right side: User context, Role badge, and Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Badge */}
        <span
          data-testid="user-role-badge"
          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-100"
        >
          <Shield className="h-3 w-3" />
          <span>{displayRole}</span>
        </span>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden text-left md:block">
            <div
              data-testid="user-full-name"
              className="text-xs font-semibold text-slate-900 leading-tight"
            >
              {displayName}
            </div>
            <div className="text-[11px] text-slate-500 leading-tight">
              Online
            </div>
          </div>
          
          <button
            type="button"
            title="Keluar dari sistem"
            onClick={logout}
            data-testid="logout-button"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
