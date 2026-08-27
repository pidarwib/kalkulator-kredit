"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  ShieldCheck,
  Search,
  Filter,
  Upload,
  Layers,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Loader2,
  X,
  Plus,
  Percent,
  History,
  FileText,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductOption {
  id: string;
  code: string;
  name: string;
  bprId: string;
  bpr?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface InsuranceRateItem {
  id: string;
  productId: string;
  age: number;
  tenorYears: number;
  premiumRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: string;
  isActive: boolean;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function InsuranceManagementPage() {
  const { user: currentUser, hasPermission } = useAuth();

  // State: Products
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // State: Table Data & Pagination
  const [rates, setRates] = useState<InsuranceRateItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });
  const [loadingRates, setLoadingRates] = useState<boolean>(true);
  const [rateError, setParamError] = useState<string | null>(null);

  // State: Filters
  const [filterAge, setFilterAge] = useState<string>("");
  const [filterTenor, setFilterTenor] = useState<string>("");
  const [filterVersion, setFilterVersion] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("true"); // default active

  // State: Quick Lookup Tool
  const [lookupAge, setLookupAge] = useState<number>(56);
  const [lookupTenor, setLookupTenor] = useState<number>(5);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // State: Import Modal
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [importVersion, setImportVersion] = useState<string>("");
  const [importEffectiveFrom, setImportEffectiveFrom] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [importDescription, setImportDescription] = useState<string>("");
  const [importSubmitting, setImportSubmitting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const canUpdate =
    hasPermission("MASTER_UPDATE") ||
    hasPermission("INSURANCE_CREATE") ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN";

  // 1. Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/v1/products");
      if (res.ok) {
        const json = await res.json();
        const list: ProductOption[] = json.data || [];
        setProducts(list);
        if (list.length > 0 && !selectedProductId) {
          setSelectedProductId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 2. Fetch Insurance Rates Table
  const fetchRates = useCallback(async () => {
    if (!selectedProductId) return;

    setLoadingRates(true);
    setParamError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", meta.page.toString());
      params.set("pageSize", meta.pageSize.toString());

      if (filterAge.trim()) {
        params.set("age", filterAge.trim());
      }
      if (filterTenor.trim()) {
        params.set("tenorYears", filterTenor.trim());
      }
      if (filterVersion.trim()) {
        params.set("version", filterVersion.trim());
      }
      if (filterStatus !== "") {
        params.set("isActive", filterStatus);
      }

      const res = await fetch(
        `/api/v1/products/${selectedProductId}/insurance-rates?${params.toString()}`
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal mengambil daftar tarif asuransi.");
      }

      const json = await res.json();
      setRates(json.data || []);
      if (json.meta) {
        setMeta({
          page: json.meta.page,
          pageSize: json.meta.pageSize,
          total: json.meta.total,
          totalPages: json.meta.totalPages,
        });
      }
    } catch (err: any) {
      setParamError(err.message || "Terjadi kesalahan saat memuat data tarif asuransi.");
    } finally {
      setLoadingRates(false);
    }
  }, [
    selectedProductId,
    meta.page,
    meta.pageSize,
    filterAge,
    filterTenor,
    filterVersion,
    filterStatus,
  ]);

  useEffect(() => {
    if (selectedProductId) {
      fetchRates();
    }
  }, [selectedProductId, fetchRates]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // 3. Quick Lookup Handler (dualLookup = true)
  const handleQuickLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !lookupAge || !lookupTenor) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await fetch(
        `/api/v1/products/${selectedProductId}/insurance-rates/lookup?age=${lookupAge}&tenorYears=${lookupTenor}&dualLookup=true`
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message ||
            `Tarif untuk usia ${lookupAge} dan tenor ${lookupTenor} tahun tidak ditemukan.`
        );
      }

      const json = await res.json();
      setLookupResult(json.data);
    } catch (err: any) {
      setLookupError(err.message || "Gagal melakukan lookup tarif.");
    } finally {
      setLookupLoading(false);
    }
  };

  // 4. Parse CSV text to Rates array
  const parseCsvRates = (text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: Array<{ age: number; tenorYears: number; premiumRate: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header if contains words like age/umur
      if (i === 0 && (line.toLowerCase().includes("age") || line.toLowerCase().includes("umur"))) {
        continue;
      }

      const parts = line.split(/[;,	\s]+/).map((p) => p.trim());
      if (parts.length >= 3) {
        const age = parseInt(parts[0], 10);
        const tenorYears = parseInt(parts[1], 10);
        // Replace comma with dot if decimals formatted with comma
        let rateStr = parts[2].replace(",", ".").replace("%", "");
        let premiumRate = parseFloat(rateStr);

        // If inputted as 2.5%, convert to 0.025 if > 1
        if (premiumRate > 1.0) {
          premiumRate = premiumRate / 100;
        }

        if (!isNaN(age) && !isNaN(tenorYears) && !isNaN(premiumRate)) {
          parsed.push({ age, tenorYears, premiumRate });
        }
      }
    }

    return parsed;
  };

  // 5. Submit Import Batch
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setImportError(null);
    setImportSuccessMsg(null);

    const parsedRates = parseCsvRates(importText);
    if (parsedRates.length === 0) {
      setImportError(
        "Format data tidak valid atau kosong. Masukkan format: Usia, Tenor, Tarif (contoh: 56 1 0.025)"
      );
      return;
    }

    setImportSubmitting(true);

    try {
      const payload = {
        rates: parsedRates,
        version: importVersion.trim() || undefined,
        effectiveFrom: importEffectiveFrom ? new Date(importEffectiveFrom).toISOString() : undefined,
        description: importDescription.trim() || undefined,
      };

      const res = await fetch(
        `/api/v1/products/${selectedProductId}/insurance-rates/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal mengimpor tarif asuransi.");
      }

      const json = await res.json();
      setImportSuccessMsg(
        `Berhasil mengimpor ${json.data?.insertedCount || parsedRates.length} tarif asuransi (Versi: ${json.data?.version || "Baru"}).`
      );

      setTimeout(() => {
        setImportModalOpen(false);
        setImportText("");
        fetchRates();
      }, 1200);
    } catch (err: any) {
      setImportError(err.message || "Terjadi kesalahan saat mengimpor tarif asuransi.");
    } finally {
      setImportSubmitting(false);
    }
  };

  const formatPercent = (val: number | null | undefined, decimals = 4): string => {
    if (val === undefined || val === null || isNaN(val)) return "0.0000%";
    const num = val > 1 ? val : val * 100;
    return `${num.toFixed(decimals)}%`;
  };

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
              <h1
                data-testid="insurance-management-title"
                className="text-xl font-bold tracking-tight text-slate-900"
              >
                Master Tarif Asuransi Jiwa & Kredit
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Tabel referensi resmi matriks tarif premi asuransi kredit berdasarkan usia nasabah dan tenor pinjaman.
            </p>
          </div>

          {/* Action Button */}
          {canUpdate && selectedProductId && (
            <button
              type="button"
              onClick={() => {
                setImportModalOpen(true);
                setImportError(null);
                setImportSuccessMsg(null);
              }}
              data-testid="import-insurance-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Upload className="h-4 w-4" />
              <span>+ Impor / Batch Update Tarif</span>
            </button>
          )}
        </div>

        {/* Product Selector Card & Quick Lookup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Product Selector (2 Cols) */}
          <div
            data-testid="insurance-product-selector"
            className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                <Layers className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Pilih Produk Kredit
                </label>
                <div className="mt-1">
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setMeta((prev) => ({ ...prev, page: 1 }));
                      setLookupResult(null);
                    }}
                    data-testid="select-product-insurance"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) {p.bpr ? `— ${p.bpr.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {selectedProduct && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Institusi:{" "}
                  <strong className="text-slate-800 font-semibold">
                    {selectedProduct.bpr?.name || "BPR Pusat"}
                  </strong>
                </span>
                <span>
                  Total Entri Tarif:{" "}
                  <strong className="text-indigo-900 font-mono font-bold">
                    {meta.total} Entri
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Quick Rate Lookup Tool (1 Col) */}
          <div
            data-testid="insurance-lookup-card"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900">
                Cek Tarif (Live Lookup)
              </h3>
            </div>

            <form onSubmit={handleQuickLookup} className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 font-medium">
                    Usia (Thn)
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={lookupAge}
                    onChange={(e) => setLookupAge(Number(e.target.value))}
                    data-testid="lookup-input-age"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-medium">
                    Tenor (Thn)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={lookupTenor}
                    onChange={(e) => setLookupTenor(Number(e.target.value))}
                    data-testid="lookup-input-tenor"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={lookupLoading}
                data-testid="lookup-submit-btn"
                className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                {lookupLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                <span>Cari Tarif Resmi</span>
              </button>

              {lookupError && (
                <p
                  data-testid="lookup-error-msg"
                  className="text-[11px] text-rose-600 font-medium mt-1 leading-tight"
                >
                  {lookupError}
                </p>
              )}

              {lookupResult && (
                <div
                  data-testid="lookup-result-box"
                  className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-950 mt-2 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-emerald-800">Tarif Resmi:</span>
                    <span className="font-mono font-bold text-sm text-emerald-900">
                      {formatPercent(lookupResult.premiumRate || lookupResult.rate)}
                    </span>
                  </div>
                  {lookupResult.ruleApplied && (
                    <div className="text-[10px] text-emerald-700">
                      Metode: {lookupResult.ruleApplied}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Filter Bar (DESIGN.md §20) */}
        <div
          data-testid="insurance-filter-bar"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Filter Age */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Filter Usia (Umur)
              </label>
              <input
                type="number"
                placeholder="Semua Usia"
                value={filterAge}
                onChange={(e) => {
                  setFilterAge(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="filter-age-input"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            {/* Filter Tenor */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Filter Tenor (Tahun)
              </label>
              <input
                type="number"
                placeholder="Semua Tenor"
                value={filterTenor}
                onChange={(e) => {
                  setFilterTenor(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="filter-tenor-input"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            {/* Filter Version */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Filter Versi
              </label>
              <input
                type="text"
                placeholder="Semua Versi (v1, v2...)"
                value={filterVersion}
                onChange={(e) => {
                  setFilterVersion(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="filter-version-input"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Status Keaktifan
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="filter-status-insurance"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
              >
                <option value="">Semua Status</option>
                <option value="true">Aktif (ACTIVE)</option>
                <option value="false">Arsip (INACTIVE)</option>
              </select>
            </div>

            {/* Reset Filter */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setFilterAge("");
                  setFilterTenor("");
                  setFilterVersion("");
                  setFilterStatus("");
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="reset-insurance-filters"
                className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingRates && (
          <div
            data-testid="insurance-loading"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
          >
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              Memuat tabel matriks tarif asuransi...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loadingRates && rateError && (
          <div
            data-testid="insurance-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"
          >
            <AlertTriangle className="mx-auto h-7 w-7 text-rose-600" />
            <h3 className="mt-2 text-xs font-bold text-rose-900">
              Gagal Memuat Tarif Asuransi
            </h3>
            <p className="mt-1 text-xs text-rose-700">{rateError}</p>
            <button
              type="button"
              onClick={fetchRates}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Data Table (DESIGN.md §20) */}
        {!loadingRates && !rateError && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table
                data-testid="insurance-rates-table"
                className="w-full text-left text-xs border-collapse"
              >
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-center w-24">Usia (Umur)</th>
                    <th className="py-3 px-4 text-center w-24">Tenor</th>
                    <th className="py-3 px-4 text-right">Tarif Premi (Rate %)</th>
                    <th className="py-3 px-4 text-center">Versi</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Periode Efektif</th>
                    <th className="py-3 px-4">Waktu Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        data-testid="insurance-empty-state"
                        className="py-12 px-4 text-center text-slate-400"
                      >
                        <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-xs font-semibold text-slate-600">
                          Tidak ada tarif asuransi yang ditemukan.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Gunakan fitur impor untuk mengunggah matriks tarif asuransi baru.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    rates.map((r) => (
                      <tr
                        key={r.id}
                        data-testid={`rate-row-${r.age}-${r.tenorYears}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Age */}
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 bg-slate-50/30">
                          {r.age} Thn
                        </td>

                        {/* Tenor */}
                        <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                          {r.tenorYears} Thn
                        </td>

                        {/* Premium Rate (Right-aligned numeric) */}
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-950 tabular-nums">
                          {formatPercent(r.premiumRate)}
                        </td>

                        {/* Version */}
                        <td className="py-2.5 px-4 text-center font-mono text-slate-600 text-[11px]">
                          {r.version}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4 text-center">
                          {r.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <span className="h-1 w-1 rounded-full bg-emerald-500" />
                              AKTIF
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              ARSIP
                            </span>
                          )}
                        </td>

                        {/* Effective Period */}
                        <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                          {formatDate(r.effectiveFrom)}{" "}
                          {r.effectiveTo ? `s/d ${formatDate(r.effectiveTo)}` : "(Aktif)"}
                        </td>

                        {/* Created At */}
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                          {formatDate(r.createdAt)}
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
                data-testid="insurance-pagination"
                className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600"
              >
                <div className="text-[11px] font-medium">
                  Halaman <span className="font-bold text-slate-900">{meta.page}</span> dari{" "}
                  <span className="font-bold text-slate-900">{meta.totalPages}</span> (Total {meta.total} tarif)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => setMeta((prev) => ({ ...prev, page: prev.page - 1 }))}
                    data-testid="pagination-prev"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setMeta((prev) => ({ ...prev, page: prev.page + 1 }))}
                    data-testid="pagination-next"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Modal */}
        {importModalOpen && (
          <div
            data-testid="insurance-import-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto"
          >
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h2
                      data-testid="import-modal-title"
                      className="text-base font-bold text-slate-900"
                    >
                      Impor / Batch Update Tarif Asuransi
                    </h2>
                    <p className="text-xs text-slate-500">
                      Unggah daftar matriks tarif asuransi baru berversi untuk produk ini.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  data-testid="close-import-modal-btn"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Feedback messages */}
              {importError && (
                <div
                  data-testid="import-error-alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccessMsg && (
                <div
                  data-testid="import-success-alert"
                  className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleImportSubmit} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Label Versi (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: v2.0"
                      value={importVersion}
                      onChange={(e) => setImportVersion(e.target.value)}
                      data-testid="import-version-input"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tanggal Berlaku Efektif
                    </label>
                    <input
                      type="date"
                      value={importEffectiveFrom}
                      onChange={(e) => setImportEffectiveFrom(e.target.value)}
                      data-testid="import-effective-from-input"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* CSV Input Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      Data Tarif (Format: Usia Tenor Tarif) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Format kolom: Usia, Tenor(Thn), Tarif
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    required
                    placeholder={`Contoh data:\n56 1 0.0125\n56 2 0.0250\n57 1 0.0130\n57 2 0.0260`}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    data-testid="import-csv-textarea"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 p-3 text-slate-900 focus:border-indigo-600 focus:outline-none leading-relaxed"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Dapat menggunakan pemisah spasi, koma, atau tab dari file Excel/CSV.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catatan Perubahan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pembaruan tarif premi asuransi rekanan Jiwasraya 2026"
                    value={importDescription}
                    onChange={(e) => setImportDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    data-testid="cancel-import-btn"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={importSubmitting}
                    data-testid="submit-import-btn"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {importSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Simpan & Aktifkan Versi Tarif</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
