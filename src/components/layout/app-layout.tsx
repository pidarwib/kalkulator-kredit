"use client";

import React, { useState } from "react";
import { Sidebar, NavGroup } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  navigation?: NavGroup[];
  organizationName?: string;
  userName?: string;
  userRole?: string;
  className?: string;
}

export function AppLayout({
  children,
  navigation,
  organizationName,
  userName,
  userRole,
  className,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      data-testid="app-layout"
      className={cn("flex min-h-screen bg-slate-50 text-slate-900", className)}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigation={navigation}
      />

      {/* Main App Container */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar Header */}
        <Topbar
          onOpenSidebar={() => setSidebarOpen(true)}
          organizationName={organizationName}
          userName={userName}
          userRole={userRole}
        />

        {/* Main Content Area */}
        <main
          data-testid="main-content"
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
