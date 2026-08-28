"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  History,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Loader2,
  X,
  Eye,
  ArrowRight,
  Layers,
  CheckCircle2,
  KeyRound,
  FileCode,
  Globe,
  Smartphone,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  userId?: string | null;
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    roleName: string;
    bpr?: string | null;
    branch?: string | null;
  } | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const { user: currentUser, hasPermission } = useAuth();

  // State: List data & pagination
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State: Filters
  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // State: Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const canExport =
    hasPermission("AUDIT_EXPORT") ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN";

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", meta.page.toString());
      params.set("pageSize", meta.pageSize.toString());

      if (search.trim()) params.set("search", search.trim());
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entityType", entityFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal memuat log audit.");
      }

      const json = await res.json();
      setLogs(json.data || []);
      if (json.meta) {
        setMeta({
          page: json.meta.page,
          pageSize: json.meta.pageSize,
          total: json.meta.total,
          totalPages: json.meta.totalPages,
        });
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat log audit.");
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.pageSize, search, actionFilter, entityFilter, startDate, endDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMeta((prev) => ({ ...prev, page: 1 }));
    fetchAuditLogs();
  };

  const handleResetFilters = () => {
    setSearch("");
    setActionFilter("");
    setEntityFilter("");
    setStartDate("");
    setEndDate("");
    setMeta((prev) => ({ ...prev, page: 1 }));
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
        second: "2-digit",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  // Helper: Get color badge for action
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("IMPORT") || act.includes("ACTIVATE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          {action}
        </span>
      );
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("PASSWORD_RESET")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          <span className="h-1 w-1 rounded-full bg-amber-500" />
          {action}
        </span>
      );
    }
    if (act.includes("DELETE") || act.includes("DEACTIVATE") || act.includes("SUSPEND")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
          <span className="h-1 w-1 rounded-full bg-rose-500" />
          {action}
        </span>
      );
    }
    if (act.includes("LOGIN")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
          <span className="h-1 w-1 rounded-full bg-indigo-500" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
        {action}
      </span>
    );
  };

  // Helper: Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      "Timestamp",
      "Actor ID",
      "Actor Name",
      "Actor Username",
      "Actor Role",
      "Action",
      "Entity Type",
      "Entity ID",
      "IP Address",
      "User Agent",
    ];

    const rows = logs.map((l) => [
      l.createdAt,
      l.userId || "-",
      `"${l.user?.fullName || "System"}"`,
      l.user?.username || "-",
      l.user?.role || "-",
      l.action,
      l.entityType,
      l.entityId || "-",
      l.ipAddress || "-",
      `"${(l.userAgent || "-").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit-trail-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-indigo-600" />
              <h1
                data-testid="audit-logs-title"
                className="text-xl font-bold tracking-tight text-slate-900"
              >
                Audit Trail & Log Aktivitas Sistem
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Pencatatan riwayat perubahan data, otentikasi pengguna, parameter underwriting, dan verifikasi kepatuhan BPR secara immutable.
            </p>
          </div>

          {/* Action Export */}
          {canExport && (
            <button
              type="button"
              onClick={handleExportCSV}
              data-testid="export-audit-btn"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Ekspor Audit Trail (CSV)</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div
          data-testid="audit-filter-card"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
        >
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Pencarian
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari aksi, entitas, user, atau IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="audit-search-input"
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Jenis Aksi
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="audit-action-filter"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                <option value="">Semua Aksi</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="USER_CREATE">USER_CREATE</option>
                <option value="USER_UPDATE">USER_UPDATE</option>
                <option value="USER_DELETE">USER_DELETE</option>
                <option value="USER_PASSWORD_RESET">USER_PASSWORD_RESET</option>
                <option value="CREDIT_PARAMETER_CREATE">CREDIT_PARAMETER_CREATE</option>
                <option value="FEE_PARAMETER_CREATE">FEE_PARAMETER_CREATE</option>
                <option value="INSURANCE_RATES_IMPORT">INSURANCE_RATES_IMPORT</option>
                <option value="SIMULATION_CREATE">SIMULATION_CREATE</option>
                <option value="PRODUCT_CREATE">PRODUCT_CREATE</option>
                <option value="PRODUCT_UPDATE">PRODUCT_UPDATE</option>
                <option value="PRODUCT_DELETE">PRODUCT_DELETE</option>
              </select>
            </div>

            {/* Entity Filter */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Modul / Entitas
              </label>
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="audit-entity-filter"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                <option value="">Semua Entitas</option>
                <option value="User">User</option>
                <option value="CreditParameter">CreditParameter</option>
                <option value="FeeParameter">FeeParameter</option>
                <option value="InsuranceRate">InsuranceRate</option>
                <option value="Product">LoanProduct</option>
                <option value="LoanProduct">LoanProduct</option>
                <option value="Simulation">Simulation</option>
                <option value="PaymentOffice">PaymentOffice</option>
                <option value="Branch">Branch</option>
                <option value="Bpr">BPR</option>
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="audit-start-date"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="audit-end-date"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </form>

          {/* Reset Filters & Count */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 text-[11px]">
              Ditemukan <strong className="text-slate-900">{meta.total}</strong> aktivitas audit
            </span>

            <button
              type="button"
              onClick={handleResetFilters}
              data-testid="reset-audit-filters-btn"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            data-testid="audit-loading"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
          >
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              Memuat log audit dan jejak aktivitas sistem...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            data-testid="audit-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"
          >
            <AlertTriangle className="mx-auto h-7 w-7 text-rose-600" />
            <h3 className="mt-2 text-xs font-bold text-rose-900">
              Gagal Memuat Log Audit
            </h3>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
            <button
              type="button"
              onClick={fetchAuditLogs}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Data Table */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table
                data-testid="audit-logs-table"
                className="w-full text-left text-xs border-collapse"
              >
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-44">Waktu (Timestamp)</th>
                    <th className="py-3 px-4">Pelaksana (Actor)</th>
                    <th className="py-3 px-4">Aksi (Action)</th>
                    <th className="py-3 px-4">Entitas Terkait</th>
                    <th className="py-3 px-4">Alamat IP</th>
                    <th className="py-3 px-4 text-center w-28">Detail Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        data-testid="audit-empty-state"
                        className="py-12 px-4 text-center text-slate-400"
                      >
                        <History className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-xs font-semibold text-slate-600">
                          Tidak ada log audit yang sesuai dengan filter.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Coba ubah kata kunci pencarian atau rentang tanggal.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        data-testid={`audit-row-${log.id}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          <div className="font-mono text-[11px] font-semibold text-slate-900">
                            {formatDate(log.createdAt)}
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4">
                          {log.user ? (
                            <div>
                              <div className="font-bold text-slate-900">
                                {log.user.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                @{log.user.username} • {log.user.role}
                              </div>
                              {log.user.bpr && (
                                <div className="text-[10px] text-indigo-600 font-medium">
                                  {log.user.bpr}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-slate-400 text-[11px]">
                              System / Anonymous
                            </span>
                          )}
                        </td>

                        {/* Action Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        {/* Entity */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {log.entityType}
                          </div>
                          {log.entityId && (
                            <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                              ID: {log.entityId}
                            </div>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {log.ipAddress || "-"}
                        </td>

                        {/* Action Details Button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            data-testid={`view-diff-btn-${log.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Lihat Diff</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div
                data-testid="audit-pagination"
                className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600"
              >
                <div className="text-[11px] font-medium">
                  Halaman <span className="font-bold text-slate-900">{meta.page}</span> dari{" "}
                  <span className="font-bold text-slate-900">{meta.totalPages}</span> (Total {meta.total} event)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => setMeta((prev) => ({ ...prev, page: prev.page - 1 }))}
                    data-testid="audit-pagination-prev"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setMeta((prev) => ({ ...prev, page: prev.page + 1 }))}
                    data-testid="audit-pagination-next"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Detail & Before/After Diff Modal */}
        {selectedLog && (
          <div
            data-testid="audit-detail-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto"
          >
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <FileCode className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2
                        data-testid="audit-modal-title"
                        className="text-base font-bold text-slate-900"
                      >
                        Detail Audit Trail
                      </h2>
                      {getActionBadge(selectedLog.action)}
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      Log ID: {selectedLog.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  data-testid="close-audit-modal-btn"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Meta Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium">Pelaksana (Actor):</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedLog.user?.fullName || "System"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    @{selectedLog.user?.username || "-"} ({selectedLog.user?.role || "-"})
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium">Entitas & Target ID:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedLog.entityType}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {selectedLog.entityId || "N/A"}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium">Waktu & IP Address:</span>
                  <p className="font-bold font-mono text-slate-900 mt-0.5">
                    {formatDate(selectedLog.createdAt)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    IP: {selectedLog.ipAddress || "-"}
                  </p>
                </div>
              </div>

              {/* Security Redaction Notice */}
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-emerald-900 text-[11px] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Proteksi Keamanan: Semua token otentikasi, kata sandi, dan kunci rahasia telah disanitasi secara otomatis.
                </span>
              </div>

              {/* Before / After Diff Viewer */}
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Perubahan Data (Before / After Payload)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before / Old Value */}
                  <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-3">
                    <div className="flex items-center justify-between border-b border-rose-200/60 pb-2 mb-2">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                        Before (Nilai Lama)
                      </span>
                    </div>
                    {selectedLog.oldValue ? (
                      <pre
                        data-testid="audit-old-value"
                        className="font-mono text-[11px] text-slate-800 bg-white/80 p-3 rounded-lg border border-rose-100 overflow-x-auto max-h-60 leading-relaxed"
                      >
                        {JSON.stringify(selectedLog.oldValue, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-4 text-center">
                        (Tidak ada nilai lama / data baru dibuat)
                      </p>
                    )}
                  </div>

                  {/* After / New Value */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2 mb-2">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        After (Nilai Baru)
                      </span>
                    </div>
                    {selectedLog.newValue ? (
                      <pre
                        data-testid="audit-new-value"
                        className="font-mono text-[11px] text-slate-800 bg-white/80 p-3 rounded-lg border border-emerald-100 overflow-x-auto max-h-60 leading-relaxed"
                      >
                        {JSON.stringify(selectedLog.newValue, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-4 text-center">
                        (Data dihapus)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Action */}
              <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  data-testid="close-audit-modal-action-btn"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
