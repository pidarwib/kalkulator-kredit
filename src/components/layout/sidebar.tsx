"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  FileSpreadsheet,
  Layers,
  Settings2,
  ShieldCheck,
  Percent,
  Users,
  History,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-provider";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiredPermission?: string;
  requiredPermissions?: string[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const defaultNavigationGroups: NavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Kalkulator Kredit",
        href: "/calculator",
        icon: Calculator,
        requiredPermission: "CREDIT_CALCULATE",
      },
      {
        title: "Daftar Simulasi",
        href: "/simulations",
        icon: FileSpreadsheet,
        requiredPermission: "SIMULATION_VIEW",
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      {
        title: "Produk Kredit",
        href: "/master/products",
        icon: Layers,
        requiredPermission: "PRODUCT_VIEW",
      },
      {
        title: "Parameter Kredit",
        href: "/master/parameters",
        icon: Settings2,
        requiredPermission: "PARAMETER_VIEW",
      },
      {
        title: "Tarif Asuransi",
        href: "/master/insurance",
        icon: ShieldCheck,
        requiredPermission: "INSURANCE_VIEW",
      },
      {
        title: "Parameter Biaya",
        href: "/master/fees",
        icon: Percent,
        requiredPermission: "FEE_VIEW",
      },
      {
        title: "Organisasi & Kantor",
        href: "/master/organization",
        icon: Building2,
        requiredPermissions: ["BPR_VIEW", "BRANCH_VIEW", "PAYMENT_OFFICE_VIEW"],
      },
    ],
  },
  {
    label: "Sistem & Keamanan",
    items: [
      {
        title: "Manajemen User",
        href: "/users",
        icon: Users,
        requiredPermission: "USER_VIEW",
      },
      {
        title: "Audit Trail",
        href: "/audit-logs",
        icon: History,
        requiredPermission: "AUDIT_VIEW",
      },
    ],
  },
];

/**
 * Filters navigation groups based on the active user permissions and role.
 * Super Admin gets access to all navigation items.
 * Groups with no authorized items are automatically omitted.
 */
export function getNavigationForUser(
  permissions: string[] = [],
  role?: string,
  baseGroups: NavGroup[] = defaultNavigationGroups
): NavGroup[] {
  if (role === "SUPER_ADMIN") {
    return baseGroups;
  }

  return baseGroups
    .map((group) => {
      const allowedItems = group.items.filter((item) => {
        if (!item.requiredPermission && !item.requiredPermissions) {
          return true;
        }

        if (item.requiredPermission) {
          return permissions.includes(item.requiredPermission);
        }

        if (item.requiredPermissions) {
          return item.requiredPermissions.some((p) => permissions.includes(p));
        }

        return true;
      });

      return {
        ...group,
        items: allowedItems,
      };
    })
    .filter((group) => group.items.length > 0);
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  navigation?: NavGroup[];
  className?: string;
}

export function Sidebar({
  isOpen = false,
  onClose,
  navigation,
  className,
}: SidebarProps) {
  const pathname = usePathname() || "/";
  const { user } = useAuth();

  // Compute permission-aware navigation items
  const activeNavigation =
    navigation ||
    getNavigationForUser(user?.permissions || [], user?.role);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          data-testid="sidebar-backdrop"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        data-testid="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-slate-900 focus:outline-none"
            onClick={onClose}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-slate-900">
                Credit Calculator
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                BPR Core System
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav aria-label="Navigasi Utama" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {activeNavigation.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
              {group.label && (
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      data-testid={`nav-item-${item.href.replace(/^\//, "").replace(/\//g, "-") || "home"}`}
                      className={cn(
                        "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-indigo-600"
                              : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            isActive
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer User Info */}
        <div className="border-t border-slate-200 p-3 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 border border-indigo-200">
              {user?.fullName
                ? user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "US"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-semibold text-slate-900">
                {user?.fullName || "User System"}
              </span>
              <span className="truncate text-[11px] text-slate-500">
                {user?.role || "Staff"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
