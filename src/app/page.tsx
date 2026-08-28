"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth/auth-provider";
import Link from "next/link";
import {
  Calculator,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Calendar,
  Layers,
  ChevronRight,
  Loader2,
  RefreshCw,
  Eye,
  User,
  Users,
  Building2,
  ShieldCheck,
  Percent,
  Landmark,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketingStats {
  simulationsToday: number;
  todayPrincipal: number;
  totalSimulations: number;
  totalPrincipal: number;
  eligibleCount: number;
  overCapacityCount: number;
  eligibilityRate: number;
}

interface AdminStats {
  totalMarketing: number;
  totalSimulations: number;
  totalPrincipal: number;
  simulationsToday: number;
  todayPrincipal: number;
  eligibleCount: number;
  overCapacityCount: number;
  eligibilityRate: number;
  activeProductsCount: number;
}

interface BranchItem {
  id: string;
  name: string;
  code: string;
  marketingCount: number;
  simulationCount: number;
}

interface RecentSimulation {
  id: string;
  simulationNumber: string;
  customerName: string;
  customerNip?: string | null;
  officerName?: string;
  branchName?: string | null;
  productName: string;
  productCode?: string;
  requestedPrincipal: number;
  monthlyInstallment: number;
  eligibilityStatus: "ELIGIBLE" | "OVER_CAPACITY";
  totalDbrPercent: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

  // State
  const [marketingStats, setMarketingStats] = useState<MarketingStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [bprName, setBprName] = useState<string>("");
  const [recentSimulations, setRecentSimulations] = useState<RecentSimulation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Dashboard Data based on role
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = isAdmin
        ? "/api/v1/dashboard/admin"
        : "/api/v1/dashboard/marketing";

      const res = await fetch(endpoint);
      if (!res.ok) {
        // Fallback to marketing if admin API fails with 403
        const mRes = await fetch("/api/v1/dashboard/marketing");
        if (mRes.ok) {
          const mJson = await mRes.json();
          setMarketingStats(mJson.data?.stats || null);
          setRecentSimulations(mJson.data?.recentSimulations || []);
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal memuat data dashboard.");
      }

      const json = await res.json();
      if (isAdmin) {
        setAdminStats(json.data?.stats || null);
        setBranches(json.data?.branches || []);
        setBprName(json.data?.bprName || "");
        setRecentSimulations(json.data?.recentSimulations || []);
      } else {
        setMarketingStats(json.data?.stats || null);
        setRecentSimulations(json.data?.recentSimulations || []);
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat dashboard.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatRupiah = (val: number | null | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Welcome & Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1
              data-testid="dashboard-page-title"
              className="text-xl font-bold tracking-tight text-slate-900"
            >
              {isAdmin ? "Dashboard Manajemen & Underwriting BPR" : "Dashboard Simulasi Kredit"}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Selamat datang kembali,{" "}
              <strong className="text-slate-800 font-semibold">
                {currentUser?.fullName || (isAdmin ? "Administrator BPR" : "Petugas Marketing")}
              </strong>
              {isAdmin && bprName ? ` — ${bprName}` : ""}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/calculator"
              data-testid="dashboard-start-calc-btn"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Mulai Simulasi Baru</span>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            data-testid="dashboard-loading"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
          >
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              Memuat metrik operasional dan ringkasan dashboard...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            data-testid="dashboard-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"
          >
            <AlertTriangle className="mx-auto h-7 w-7 text-rose-600" />
            <h3 className="mt-2 text-xs font-bold text-rose-900">
              Gagal Memuat Data Dashboard
            </h3>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
            <button
              type="button"
              onClick={fetchDashboardData}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Content: KPI Cards + Tables */}
        {!loading && !error && (
          <div className="space-y-6">
            {/* ADMIN DASHBOARD VIEW (TASK-061) */}
            {isAdmin && adminStats && (
              <div className="space-y-6">
                {/* 4 Focused Management KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* KPI 1: Total Petugas Marketing */}
                  <div
                    data-testid="admin-kpi-marketing"
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Total Marketing
                      </span>
                      <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div
                        data-testid="admin-marketing-count"
                        className="text-2xl font-bold font-mono text-slate-900"
                      >
                        {adminStats.totalMarketing}{" "}
                        <span className="text-sm font-sans font-medium text-slate-500">
                          Petugas
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Aktif di seluruh cabang
                      </p>
                    </div>
                  </div>

                  {/* KPI 2: Total Simulasi BPR */}
                  <div
                    data-testid="admin-kpi-total-sim"
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Total Simulasi
                      </span>
                      <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                        <Layers className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div
                        data-testid="admin-total-sim-count"
                        className="text-2xl font-bold font-mono text-slate-900"
                      >
                        {adminStats.totalSimulations}{" "}
                        <span className="text-sm font-sans font-medium text-slate-500">
                          Pengajuan
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        Plafon:{" "}
                        <strong className="font-mono font-semibold text-slate-700">
                          {formatRupiah(adminStats.totalPrincipal)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* KPI 3: Simulasi Hari Ini */}
                  <div
                    data-testid="admin-kpi-today"
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Simulasi Hari Ini
                      </span>
                      <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div
                        data-testid="admin-today-count"
                        className="text-2xl font-bold font-mono text-slate-900"
                      >
                        {adminStats.simulationsToday}{" "}
                        <span className="text-sm font-sans font-medium text-slate-500">
                          Hari Ini
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        Plafon:{" "}
                        <strong className="font-mono font-semibold text-slate-700">
                          {formatRupiah(adminStats.todayPrincipal)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* KPI 4: Eligibility Summary */}
                  <div
                    data-testid="admin-kpi-eligibility"
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-200 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Eligibility Summary
                      </span>
                      <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div
                        data-testid="admin-eligibility-rate"
                        className="text-2xl font-bold font-mono text-emerald-700"
                      >
                        {adminStats.eligibilityRate}%
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="text-emerald-700 font-semibold">
                          {adminStats.eligibleCount} Layak
                        </span>{" "}
                        •{" "}
                        <span className="text-amber-700 font-semibold">
                          {adminStats.overCapacityCount} Over
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Branches Activity Breakdown (If branches exist) */}
                {branches.length > 0 && (
                  <div
                    data-testid="admin-branches-card"
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-900">
                          Distribusi Kantor Cabang ({branches.length} Cabang)
                        </h2>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        Aktivitas Tim Pemasaran
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {branches.map((b) => (
                        <div
                          key={b.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{b.name}</span>
                            <p className="text-[11px] text-slate-400 font-mono">{b.code}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-800">
                              {b.simulationCount} Simulasi
                            </span>
                            <p className="text-[11px] text-indigo-600 font-medium">
                              {b.marketingCount} Marketing
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MARKETING DASHBOARD VIEW (TASK-060) */}
            {!isAdmin && marketingStats && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Simulasi Hari Ini */}
                <div
                  data-testid="kpi-simulations-today"
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Simulasi Hari Ini
                    </span>
                    <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div
                      data-testid="kpi-today-count"
                      className="text-2xl font-bold font-mono text-slate-900"
                    >
                      {marketingStats.simulationsToday}{" "}
                      <span className="text-sm font-sans font-medium text-slate-500">
                        Pengajuan
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Plafon:{" "}
                      <strong className="font-mono font-semibold text-slate-700">
                        {formatRupiah(marketingStats.todayPrincipal)}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Total Simulasi */}
                <div
                  data-testid="kpi-total-simulations"
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Simulasi
                    </span>
                    <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                      <Layers className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div
                      data-testid="kpi-total-count"
                      className="text-2xl font-bold font-mono text-slate-900"
                    >
                      {marketingStats.totalSimulations}{" "}
                      <span className="text-sm font-sans font-medium text-slate-500">
                        Simulasi
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Plafon:{" "}
                      <strong className="font-mono font-semibold text-slate-700">
                        {formatRupiah(marketingStats.totalPrincipal)}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Tingkat Kelayakan */}
                <div
                  data-testid="kpi-eligibility-rate"
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-200 transition-all sm:col-span-2 lg:col-span-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Tingkat Kelayakan DBR
                    </span>
                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div
                      data-testid="kpi-eligibility-value"
                      className="text-2xl font-bold font-mono text-emerald-700"
                    >
                      {marketingStats.eligibilityRate}%
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="text-emerald-700 font-semibold">
                        {marketingStats.eligibleCount} Layak
                      </span>{" "}
                      •{" "}
                      <span className="text-amber-700 font-semibold">
                        {marketingStats.overCapacityCount} Over
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Simulations Section (Common for both views) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <h2
                    data-testid="recent-simulations-title"
                    className="text-base font-bold text-slate-900"
                  >
                    {isAdmin ? "Simulasi Terbaru di Lingkup BPR" : "Simulasi Terbaru"}
                  </h2>
                </div>

                <Link
                  href="/simulations"
                  data-testid="view-all-simulations-link"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>Lihat Semua Simulasi</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table
                    data-testid="recent-simulations-table"
                    className="w-full text-left text-xs border-collapse"
                  >
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">No. Simulasi</th>
                        <th className="py-3 px-4">Nasabah</th>
                        {isAdmin && <th className="py-3 px-4">Petugas / Cabang</th>}
                        <th className="py-3 px-4">Produk Kredit</th>
                        <th className="py-3 px-4 text-right">Plafon Diajukan</th>
                        <th className="py-3 px-4 text-right">Angsuran / Bln</th>
                        <th className="py-3 px-4 text-center">Status Kelayakan</th>
                        <th className="py-3 px-4">Waktu Dibuat</th>
                        <th className="py-3 px-4 text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {recentSimulations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isAdmin ? 9 : 8}
                            data-testid="dashboard-empty-simulations"
                            className="py-12 text-center text-slate-400"
                          >
                            <Calculator className="mx-auto h-8 w-8 text-slate-300" />
                            <p className="mt-2 text-xs font-semibold text-slate-600">
                              Belum ada simulasi kredit yang tersimpan.
                            </p>
                            <Link
                              href="/calculator"
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>Mulai Simulasi Baru</span>
                            </Link>
                          </td>
                        </tr>
                      ) : (
                        recentSimulations.map((sim) => (
                          <tr
                            key={sim.id}
                            data-testid={`recent-row-${sim.id}`}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            {/* Simulation Number */}
                            <td className="py-3 px-4 font-mono font-bold text-indigo-950">
                              {sim.simulationNumber}
                            </td>

                            {/* Customer Name & NIP */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">
                                {sim.customerName}
                              </div>
                              {sim.customerNip && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  NIP: {sim.customerNip}
                                </div>
                              )}
                            </td>

                            {/* Officer / Branch (for Admin) */}
                            {isAdmin && (
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-800">
                                  {sim.officerName || "Petugas"}
                                </div>
                                {sim.branchName && (
                                  <div className="text-[10px] text-slate-400">
                                    {sim.branchName}
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Product */}
                            <td className="py-3 px-4 text-slate-700">
                              <div>{sim.productName}</div>
                            </td>

                            {/* Requested Principal */}
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                              {formatRupiah(sim.requestedPrincipal)}
                            </td>

                            {/* Monthly Installment */}
                            <td className="py-3 px-4 text-right font-mono text-slate-800 tabular-nums">
                              {formatRupiah(sim.monthlyInstallment)}
                            </td>

                            {/* Eligibility Badge */}
                            <td className="py-3 px-4 text-center">
                              {sim.eligibilityStatus === "ELIGIBLE" ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                  LAYAK (ELIGIBLE)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                                  OVER CAPACITY
                                </span>
                              )}
                            </td>

                            {/* Timestamp */}
                            <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                              {formatDate(sim.createdAt)}
                            </td>

                            {/* Action Detail Link */}
                            <td className="py-3 px-4 text-center">
                              <Link
                                href={`/simulations/${sim.id}`}
                                data-testid={`view-detail-btn-${sim.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Detail</span>
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
