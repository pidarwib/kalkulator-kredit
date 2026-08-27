"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppLayout, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  Calculator,
  Search,
  Filter,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  RefreshCw,
  X,
  Layers,
  Building2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SimulationListItem {
  id: string;
  simulationNumber: string;
  customerName: string;
  customerNip?: string;
  requestedPrincipal: number;
  tenorMonths: number;
  calculationMethod: string;
  status: string;
  isEligible: boolean;
  dbr: number;
  installment: number;
  netDisbursement?: number;
  createdAt: string;
  product?: {
    id: string;
    code: string;
    name: string;
  };
  creator?: {
    id: string;
    fullName: string;
    username: string;
  };
  bpr?: {
    id: string;
    code: string;
    name: string;
  };
}

interface MetaPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function SimulationsPage() {
  const { user } = useAuth();

  const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
  const [meta, setMeta] = useState<MetaPagination>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [productIdFilter, setProductIdFilter] = useState<string>("");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Options State
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch active products for filter dropdown
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/v1/products");
        if (res.ok) {
          const json = await res.json();
          setProducts(json.data || []);
        }
      } catch (err) {
        console.error("[SimulationsPage] Failed to load products:", err);
      }
    }
    loadProducts();
  }, []);

  // Fetch simulations list
  const fetchSimulations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("pageSize", pageSize.toString());

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (productIdFilter) params.set("productId", productIdFilter);
      if (createdFrom) params.set("createdFrom", createdFrom);
      if (createdTo) params.set("createdTo", createdTo);

      const res = await fetch(`/api/v1/simulations?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(
          json?.error?.message || "Gagal memuat daftar simulasi kredit."
        );
        setSimulations([]);
        return;
      }

      setSimulations(json.data || []);
      if (json.meta) {
        setMeta(json.meta);
      }
    } catch (err) {
      console.error("[SimulationsPage] Fetch error:", err);
      setErrorMessage("Terjadi kesalahan jaringan saat memuat daftar simulasi.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, search, statusFilter, productIdFilter, createdFrom, createdTo]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setProductIdFilter("");
    setCreatedFrom("");
    setCreatedTo("");
    setCurrentPage(1);
  };

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
      <PageHeader
        title={user?.role === "MARKETING" ? "Simulasi Saya" : "Daftar Simulasi Kredit"}
        description={
          user?.role === "MARKETING"
            ? "Riwayat dan manajemen proposal simulasi kredit yang Anda buat."
            : "Manajemen seluruh simulasi kredit dan analisis kelayakan debitur BPR."
        }
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Simulasi Kredit" },
        ]}
        actions={
          <Link
            href="/calculator"
            data-testid="btn-create-simulation"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Hitung Simulasi Baru</span>
          </Link>
        }
      />

      <div className="space-y-6 pb-12">
        {/* Error Alert */}
        {errorMessage && (
          <div
            data-testid="simulations-error-banner"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-in fade-in duration-200"
            role="alert"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold">Gagal Memuat Data</h4>
              <p className="mt-0.5 text-xs text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Filter and Search Container */}
        <div
          data-testid="simulation-filter-card"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Pencarian
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor simulasi, nama nasabah, NIP..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  data-testid="search-simulation-input"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Status Kelayakan
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="filter-status-select"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">Semua Status</option>
                <option value="OK">ELIGIBLE (OK)</option>
                <option value="OVER">NOT ELIGIBLE (OVER)</option>
              </select>
            </div>

            {/* Product Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Produk Kredit
              </label>
              <select
                value={productIdFilter}
                onChange={(e) => {
                  setProductIdFilter(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="filter-product-select"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">Semua Produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range / Reset */}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                data-testid="btn-reset-filters"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div
          data-testid="simulation-table-card"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          {isLoading ? (
            <div
              data-testid="simulations-loading"
              className="py-16 text-center text-slate-500"
            >
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="mt-3 text-xs font-medium">Memuat data simulasi...</p>
            </div>
          ) : simulations.length === 0 ? (
            <div
              data-testid="simulations-empty-state"
              className="py-16 px-4 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Calculator className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                Tidak ada simulasi ditemukan
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {search || statusFilter || productIdFilter
                  ? "Tidak ada simulasi yang cocok dengan filter pencarian yang diterapkan."
                  : "Belum ada simulasi kredit yang disimpan. Buat simulasi pertama Anda sekarang."}
              </p>
              <div className="mt-4">
                <Link
                  href="/calculator"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Hitung Simulasi</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table
                  data-testid="simulations-table"
                  className="w-full text-left text-xs border-collapse"
                >
                  <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">No. Simulasi</th>
                      <th className="py-3.5 px-4">Tanggal</th>
                      <th className="py-3.5 px-4">Nasabah</th>
                      <th className="py-3.5 px-4">Produk</th>
                      <th className="py-3.5 px-4 text-right">Plafon</th>
                      <th className="py-3.5 px-4 text-right">Angsuran</th>
                      <th className="py-3.5 px-4 text-right">DBR</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {simulations.map((item) => {
                      const isEligible = item.isEligible || item.status === "OK";
                      const dbrPercent = (item.dbr * 100).toFixed(1);

                      return (
                        <tr
                          key={item.id}
                          data-testid={`simulation-row-${item.id}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* No. Simulasi */}
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                            <Link
                              href={`/simulations/${item.id}`}
                              className="hover:underline focus:outline-none"
                            >
                              {item.simulationNumber}
                            </Link>
                          </td>

                          {/* Tanggal */}
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {formatDate(item.createdAt)}
                          </td>

                          {/* Nasabah */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">
                              {item.customerName || "-"}
                            </div>
                            {item.customerNip && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                NIP: {item.customerNip}
                              </div>
                            )}
                          </td>

                          {/* Produk */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {item.product?.name || "Produk Kredit"}
                            </div>
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              {item.calculationMethod} • {item.tenorMonths} Bln
                            </span>
                          </td>

                          {/* Plafon */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatRupiah(item.requestedPrincipal)}
                          </td>

                          {/* Angsuran */}
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-indigo-950 tabular-nums">
                            {formatRupiah(item.installment)}
                          </td>

                          {/* DBR */}
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            <span
                              className={cn(
                                "font-bold",
                                item.dbr > 0.9 ? "text-amber-700" : "text-slate-700"
                              )}
                            >
                              {dbrPercent}%
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              data-testid={`badge-status-${item.id}`}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border",
                                isEligible
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              )}
                            >
                              {isEligible ? "ELIGIBLE" : "OVER"}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-center">
                            <Link
                              href={`/simulations/${item.id}`}
                              data-testid={`btn-view-${item.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>Detail</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/40 text-xs">
                <div className="text-slate-500">
                  Menampilkan{" "}
                  <span className="font-semibold text-slate-900">
                    {(meta.page - 1) * meta.pageSize + 1} -{" "}
                    {Math.min(meta.page * meta.pageSize, meta.totalCount)}
                  </span>{" "}
                  dari <span className="font-semibold text-slate-900">{meta.totalCount}</span> simulasi
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => setCurrentPage(1)}
                    data-testid="pagination-first"
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={!meta.hasPrev}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    data-testid="pagination-prev"
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-2 font-semibold text-slate-700">
                    {meta.page} / {meta.totalPages || 1}
                  </span>

                  <button
                    type="button"
                    disabled={!meta.hasNext}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, meta.totalPages))}
                    data-testid="pagination-next"
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setCurrentPage(meta.totalPages)}
                    data-testid="pagination-last"
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
