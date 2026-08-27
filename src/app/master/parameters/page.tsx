"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth/auth-provider";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PercentageInput } from "@/components/ui/percentage-input";
import {
  Settings2,
  SlidersHorizontal,
  Layers,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  History,
  Info,
  ArrowRight,
  RefreshCw,
  Loader2,
  X,
  Check,
  TrendingUp,
  Percent,
  Coins,
  ShieldAlert,
  User,
  ArrowDownRight,
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

interface CreditParameterData {
  id: string;
  productId: string;
  version: string;
  maximumAgeYears: number;
  maximumAgeMonths: number;
  maximumTenorMonths: number;
  maximumPrincipal: number;
  maximumDbr: number;
  flatAnnualRate: number;
  flatMonthlyRate: number;
  principalRoundingIncrement: number;
  installmentDeductionPeriods: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
}

export default function ParameterManagementPage() {
  const { user: currentUser, hasPermission } = useAuth();

  // State: Products and active selection
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // State: Active Parameter & Versions History
  const [activeParam, setActiveParam] = useState<CreditParameterData | null>(null);
  const [versions, setVersions] = useState<CreditParameterData[]>([]);
  const [loadingParam, setLoadingParam] = useState<boolean>(false);
  const [paramError, setParamError] = useState<string | null>(null);

  // State: Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<"form" | "confirm">("form");
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs for new version
  const [formData, setFormData] = useState({
    maximumAgeYears: 75,
    maximumAgeMonths: 0,
    maximumTenorMonths: 120,
    maximumPrincipal: 200000000,
    maximumDbr: 0.9, // 90%
    flatAnnualRate: 0.108, // 10.8%
    principalRoundingIncrement: 100000,
    installmentDeductionPeriods: 2,
    effectiveFrom: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canCreateVersion =
    hasPermission("CREDIT_PARAMETER_CREATE") ||
    hasPermission("MASTER_CREATE") ||
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

  // 2. Fetch Active Parameter & Versions for selected product
  const fetchParameters = useCallback(async (prodId: string) => {
    if (!prodId) return;

    setLoadingParam(true);
    setParamError(null);

    try {
      // Active parameter lookup
      const activeRes = await fetch(`/api/v1/products/${prodId}/credit-parameters`);
      if (activeRes.ok) {
        const json = await activeRes.json();
        setActiveParam(json.data);
      } else if (activeRes.status === 404) {
        setActiveParam(null);
      } else {
        const errJson = await activeRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal memuat parameter aktif.");
      }

      // Versions history lookup
      const versionsRes = await fetch(`/api/v1/products/${prodId}/credit-parameters/versions`);
      if (versionsRes.ok) {
        const vJson = await versionsRes.json();
        setVersions(vJson.data || []);
      } else {
        setVersions([]);
      }
    } catch (err: any) {
      setParamError(err.message || "Terjadi kesalahan saat memuat parameter kredit.");
    } finally {
      setLoadingParam(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      fetchParameters(selectedProductId);
    }
  }, [selectedProductId, fetchParameters]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Open Create Version Modal
  const handleOpenCreateModal = () => {
    setModalStep("form");
    setFormError(null);
    setFieldErrors({});

    if (activeParam) {
      setFormData({
        maximumAgeYears: activeParam.maximumAgeYears,
        maximumAgeMonths: activeParam.maximumAgeMonths,
        maximumTenorMonths: activeParam.maximumTenorMonths,
        maximumPrincipal: activeParam.maximumPrincipal,
        maximumDbr: activeParam.maximumDbr,
        flatAnnualRate: activeParam.flatAnnualRate,
        principalRoundingIncrement: activeParam.principalRoundingIncrement,
        installmentDeductionPeriods: activeParam.installmentDeductionPeriods,
        effectiveFrom: new Date().toISOString().split("T")[0],
        description: "",
      });
    } else {
      setFormData({
        maximumAgeYears: 75,
        maximumAgeMonths: 0,
        maximumTenorMonths: 120,
        maximumPrincipal: 200000000,
        maximumDbr: 0.9,
        flatAnnualRate: 0.108,
        principalRoundingIncrement: 100000,
        installmentDeductionPeriods: 2,
        effectiveFrom: new Date().toISOString().split("T")[0],
        description: "",
      });
    }

    setModalOpen(true);
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.maximumAgeYears || formData.maximumAgeYears < 18 || formData.maximumAgeYears > 100) {
      errs.maximumAgeYears = "Batas usia tahun harus antara 18 hingga 100 tahun.";
    }
    if (formData.maximumTenorMonths < 1 || formData.maximumTenorMonths > 360) {
      errs.maximumTenorMonths = "Tenor maksimal harus antara 1 hingga 360 bulan.";
    }
    if (formData.maximumPrincipal <= 0) {
      errs.maximumPrincipal = "Plafon maksimal harus lebih dari Rp 0.";
    }
    if (formData.maximumDbr <= 0 || formData.maximumDbr > 1.0) {
      errs.maximumDbr = "DBR maksimal harus antara 0.01 (1%) hingga 1.00 (100%).";
    }
    if (formData.flatAnnualRate <= 0 || formData.flatAnnualRate > 1.0) {
      errs.flatAnnualRate = "Suku bunga flat tahunan harus lebih dari 0%.";
    }
    if (!formData.effectiveFrom) {
      errs.effectiveFrom = "Tanggal efektif berlaku wajib diisi.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Proceed to Step 2: Confirmation / Diff
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setModalStep("confirm");
  };

  // Submit New Version to API
  const handleSubmitNewVersion = async () => {
    if (!selectedProductId) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        maximumAgeYears: Number(formData.maximumAgeYears),
        maximumAgeMonths: Number(formData.maximumAgeMonths || 0),
        maximumTenorMonths: Number(formData.maximumTenorMonths),
        maximumPrincipal: Number(formData.maximumPrincipal),
        maximumDbr: Number(formData.maximumDbr),
        flatAnnualRate: Number(formData.flatAnnualRate),
        flatMonthlyRate: Number(formData.flatAnnualRate) / 12,
        principalRoundingIncrement: Number(formData.principalRoundingIncrement || 100000),
        installmentDeductionPeriods: Number(formData.installmentDeductionPeriods || 0),
        effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
        description: formData.description.trim() || undefined,
      };

      const res = await fetch(
        `/api/v1/products/${selectedProductId}/credit-parameters/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal mengaktifkan versi parameter baru.");
      }

      setModalOpen(false);
      fetchParameters(selectedProductId);
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat menyimpan versi parameter.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const formatRupiah = (val: number | null | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatPercent = (val: number | null | undefined, decimals = 2): string => {
    if (val === undefined || val === null || isNaN(val)) return "0%";
    const num = val > 1 ? val : val * 100;
    return `${num.toFixed(decimals)}%`;
  };

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-indigo-600" />
              <h1
                data-testid="parameter-management-title"
                className="text-xl font-bold tracking-tight text-slate-900"
              >
                Master Parameter Kredit
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Kelola parameter underwriting kredit, batas DBR, suku bunga flat, plafon, dan batas usia per produk.
            </p>
          </div>

          {/* Action CTA */}
          {canCreateVersion && selectedProductId && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              data-testid="create-version-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              <span>+ Buat Versi Parameter Baru</span>
            </button>
          )}
        </div>

        {/* Product Selector Card */}
        <div
          data-testid="product-selector-card"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Pilih Produk Kredit
                </label>
                <div className="mt-1">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    data-testid="select-product-parameter"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
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
              <div className="text-right text-xs">
                <span className="font-semibold text-slate-700">
                  {selectedProduct.bpr?.name || "BPR Pusat"}
                </span>
                <p className="text-[11px] font-mono text-slate-400">
                  {selectedProduct.code}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loadingParam && (
          <div
            data-testid="parameter-loading"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
          >
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              Memuat parameter kredit aktif dan riwayat versi...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loadingParam && paramError && (
          <div
            data-testid="parameter-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"
          >
            <AlertTriangle className="mx-auto h-7 w-7 text-rose-600" />
            <h3 className="mt-2 text-xs font-bold text-rose-900">
              Gagal Memuat Parameter Kredit
            </h3>
            <p className="mt-1 text-xs text-rose-700">{paramError}</p>
            <button
              type="button"
              onClick={() => fetchParameters(selectedProductId)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Active Parameter Card (DESIGN.md §19) */}
        {!loadingParam && !paramError && (
          <div className="space-y-6">
            {activeParam ? (
              <div
                data-testid="active-parameter-card"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
              >
                {/* Active Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          Parameter Kredit Aktif
                        </h2>
                        <span
                          data-testid="active-version-badge"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold font-mono text-emerald-700"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Versi {activeParam.version} (AKTIF)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Berlaku Efektif Sejak:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatDate(activeParam.effectiveFrom)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    <div>Waktu Dibuat: {formatDate(activeParam.createdAt)}</div>
                    {activeParam.createdBy && <div>Oleh: User #{activeParam.createdBy}</div>}
                  </div>
                </div>

                {/* Structured Financial Parameter Grid (DESIGN.md §19) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* DBR Maksimum */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      DBR Maksimum
                    </span>
                    <div
                      data-testid="active-param-dbr"
                      className="mt-1 text-xl font-bold font-mono text-indigo-950"
                    >
                      {formatPercent(activeParam.maximumDbr)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Batas beban angsuran maksimal gaji
                    </p>
                  </div>

                  {/* Suku Bunga Flat */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Flat Rate Tahunan
                    </span>
                    <div
                      data-testid="active-param-rate"
                      className="mt-1 text-xl font-bold font-mono text-indigo-950"
                    >
                      {formatPercent(activeParam.flatAnnualRate)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Flat Bulanan: {formatPercent(activeParam.flatMonthlyRate, 4)}
                    </p>
                  </div>

                  {/* Tenor Maksimum */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Tenor Maksimum
                    </span>
                    <div
                      data-testid="active-param-tenor"
                      className="mt-1 text-xl font-bold text-slate-900"
                    >
                      {activeParam.maximumTenorMonths} Bulan
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {Math.floor(activeParam.maximumTenorMonths / 12)} Tahun
                    </p>
                  </div>

                  {/* Plafon Maksimum */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Plafon Maksimum
                    </span>
                    <div
                      data-testid="active-param-principal"
                      className="mt-1 text-xl font-bold font-mono text-slate-900"
                    >
                      {formatRupiah(activeParam.maximumPrincipal)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pembulatan: {formatRupiah(activeParam.principalRoundingIncrement)}
                    </p>
                  </div>
                </div>

                {/* Secondary Parameters Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Batas Usia Maksimal:</span>
                    <p
                      data-testid="active-param-age"
                      className="font-semibold text-slate-800 mt-0.5"
                    >
                      {activeParam.maximumAgeYears} Tahun {activeParam.maximumAgeMonths} Bulan (Jatuh Tempo)
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Potongan Angsuran di Muka:</span>
                    <p
                      data-testid="active-param-deduction"
                      className="font-semibold text-slate-800 mt-0.5"
                    >
                      {activeParam.installmentDeductionPeriods} Bulan Angsuran
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Pembulatan Plafon Kredit:</span>
                    <p className="font-semibold font-mono text-slate-800 mt-0.5">
                      Kelipatan {formatRupiah(activeParam.principalRoundingIncrement)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                data-testid="parameter-empty-state"
                className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"
              >
                <SlidersHorizontal className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-bold text-slate-800">
                  Belum Ada Parameter Kredit Aktif
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Produk ini belum memiliki parameter underwriting yang aktif.
                </p>
                {canCreateVersion && (
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="mt-4 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Inisialisasi Versi Parameter Pertama</span>
                  </button>
                )}
              </div>
            )}

            {/* Historical Versions Table */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Riwayat Versi Parameter (Audit Trail)
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  Total {versions.length} Versi
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table
                    data-testid="parameter-versions-table"
                    className="w-full text-left text-xs border-collapse"
                  >
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Versi</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Periode Efektif</th>
                        <th className="py-3 px-4 text-right">DBR Max</th>
                        <th className="py-3 px-4 text-right">Flat Rate</th>
                        <th className="py-3 px-4 text-right">Plafon Max</th>
                        <th className="py-3 px-4 text-center">Tenor Max</th>
                        <th className="py-3 px-4">Dibuat Pada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {versions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Belum ada riwayat versi parameter.
                          </td>
                        </tr>
                      ) : (
                        versions.map((v) => (
                          <tr
                            key={v.id}
                            data-testid={`version-row-${v.version}`}
                            className={cn(
                              "hover:bg-slate-50/80 transition-colors",
                              v.isActive ? "bg-emerald-50/20" : ""
                            )}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {v.version}
                            </td>
                            <td className="py-3 px-4">
                              {v.isActive ? (
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
                            <td className="py-3 px-4 text-slate-700">
                              <div>{formatDate(v.effectiveFrom)}</div>
                              <div className="text-[10px] text-slate-400">
                                s/d {v.effectiveTo ? formatDate(v.effectiveTo) : "Sekarang"}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-indigo-950">
                              {formatPercent(v.maximumDbr)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800">
                              {formatPercent(v.flatAnnualRate)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800">
                              {formatRupiah(v.maximumPrincipal)}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-800">
                              {v.maximumTenorMonths} Bln
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {formatDate(v.createdAt)}
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

        {/* Create New Parameter Version Modal with Confirmation Diff Flow (DESIGN.md §21) */}
        {modalOpen && (
          <div
            data-testid="parameter-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto"
          >
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <h2
                      data-testid="parameter-modal-title"
                      className="text-base font-bold text-slate-900"
                    >
                      {modalStep === "form"
                        ? "Buat Versi Parameter Kredit Baru"
                        : "Konfirmasi Aktivasi Parameter Baru"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {modalStep === "form"
                        ? "Versi lama akan diarsipkan secara immutable dan versi baru akan langsung aktif."
                        : "Periksa kembali perbandingan nilai parameter lama vs baru sebelum aktivasi."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  data-testid="close-modal-btn"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Error Banner */}
              {formError && (
                <div
                  data-testid="form-error-alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: FORM INPUT */}
              {modalStep === "form" && (
                <form onSubmit={handleProceedToConfirm} className="mt-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* DBR Maksimum */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        DBR Maksimum (%) <span className="text-rose-500">*</span>
                      </label>
                      <PercentageInput
                        value={formData.maximumDbr}
                        isDecimalRatio={true}
                        onChange={(val) => setFormData({ ...formData, maximumDbr: val })}
                        error={fieldErrors.maximumDbr}
                        helperText="Batas beban angsuran (misal 90%)"
                        data-testid="input-dbr"
                      />
                    </div>

                    {/* Suku Bunga Flat Tahunan */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Suku Bunga Flat Tahunan (%) <span className="text-rose-500">*</span>
                      </label>
                      <PercentageInput
                        value={formData.flatAnnualRate}
                        isDecimalRatio={true}
                        decimals={2}
                        onChange={(val) => setFormData({ ...formData, flatAnnualRate: val })}
                        error={fieldErrors.flatAnnualRate}
                        helperText="Suku bunga flat per tahun (misal 10.8%)"
                        data-testid="input-flat-rate"
                      />
                    </div>

                    {/* Plafon Maksimal */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Plafon Maksimal (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <CurrencyInput
                        value={formData.maximumPrincipal}
                        onChange={(val) => setFormData({ ...formData, maximumPrincipal: val })}
                        error={fieldErrors.maximumPrincipal}
                        data-testid="input-max-principal"
                      />
                    </div>

                    {/* Tenor Maksimal */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Batas Tenor Maksimal (Bulan) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={360}
                        value={formData.maximumTenorMonths}
                        onChange={(e) =>
                          setFormData({ ...formData, maximumTenorMonths: Number(e.target.value) })
                        }
                        data-testid="input-max-tenor"
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1",
                          fieldErrors.maximumTenorMonths
                            ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600"
                            : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                        )}
                      />
                      {fieldErrors.maximumTenorMonths && (
                        <p className="mt-1 text-[11px] text-rose-600 font-medium">
                          {fieldErrors.maximumTenorMonths}
                        </p>
                      )}
                    </div>

                    {/* Batas Usia Maksimal */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Batas Usia Maksimal (Tahun & Bulan) <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Tahun (misal 75)"
                          value={formData.maximumAgeYears}
                          onChange={(e) =>
                            setFormData({ ...formData, maximumAgeYears: Number(e.target.value) })
                          }
                          data-testid="input-max-age-years"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                        <input
                          type="number"
                          placeholder="Bulan (misal 0)"
                          value={formData.maximumAgeMonths}
                          onChange={(e) =>
                            setFormData({ ...formData, maximumAgeMonths: Number(e.target.value) })
                          }
                          data-testid="input-max-age-months"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    {/* Potongan Angsuran di Muka */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Potongan Angsuran di Muka (Periode)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={12}
                        value={formData.installmentDeductionPeriods}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            installmentDeductionPeriods: Number(e.target.value),
                          })
                        }
                        data-testid="input-deduction-periods"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    {/* Pembulatan Plafon */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Pembulatan Plafon (Rp)
                      </label>
                      <CurrencyInput
                        value={formData.principalRoundingIncrement}
                        onChange={(val) =>
                          setFormData({ ...formData, principalRoundingIncrement: val })
                        }
                        data-testid="input-rounding"
                      />
                    </div>

                    {/* Tanggal Efektif */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tanggal Berlaku Efektif <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.effectiveFrom}
                        onChange={(e) =>
                          setFormData({ ...formData, effectiveFrom: e.target.value })
                        }
                        data-testid="input-effective-from"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Deskripsi Alasan Perubahan */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Catatan / Alasan Perubahan Versi
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Penyesuaian batas DBR dan suku bunga tahunan per SK Direksi..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      data-testid="input-version-desc"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      data-testid="cancel-modal-btn"
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      data-testid="proceed-confirm-btn"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <span>Lanjut ke Konfirmasi</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: CONFIRMATION / DIFF PREVIEW (DESIGN.md §21) */}
              {modalStep === "confirm" && (
                <div className="mt-4 space-y-4 text-xs">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-900 flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[12px]">Perhatian Sensitivitas Parameter Finansial:</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        Mengaktifkan versi baru akan mengarsipkan versi aktif saat ini secara permanen. Semua kalkulasi baru yang dibuat setelah tanggal efektif akan menggunakan parameter ini.
                      </p>
                    </div>
                  </div>

                  {/* Diff Comparison Table */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Parameter</th>
                          <th className="py-2.5 px-4 text-right">Nilai Saat Ini</th>
                          <th className="py-2.5 px-4 text-center w-8"></th>
                          <th className="py-2.5 px-4 text-right bg-indigo-50/40 text-indigo-950 font-extrabold">
                            Nilai Baru
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {/* DBR */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">DBR Maksimum</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-500">
                            {activeParam ? formatPercent(activeParam.maximumDbr) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                            {formatPercent(formData.maximumDbr)}
                          </td>
                        </tr>

                        {/* Flat Rate */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Flat Rate Tahunan</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-500">
                            {activeParam ? formatPercent(activeParam.flatAnnualRate) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                            {formatPercent(formData.flatAnnualRate)}
                          </td>
                        </tr>

                        {/* Plafon Maksimal */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Plafon Maksimal</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-500">
                            {activeParam ? formatRupiah(activeParam.maximumPrincipal) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                            {formatRupiah(formData.maximumPrincipal)}
                          </td>
                        </tr>

                        {/* Tenor Maksimal */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Tenor Maksimal</td>
                          <td className="py-2 px-4 text-right text-slate-500">
                            {activeParam ? `${activeParam.maximumTenorMonths} Bulan` : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-bold text-indigo-700 bg-indigo-50/20">
                            {formData.maximumTenorMonths} Bulan
                          </td>
                        </tr>

                        {/* Batas Usia */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Batas Usia Maksimal</td>
                          <td className="py-2 px-4 text-right text-slate-500">
                            {activeParam
                              ? `${activeParam.maximumAgeYears} Thn ${activeParam.maximumAgeMonths} Bln`
                              : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-bold text-indigo-700 bg-indigo-50/20">
                            {formData.maximumAgeYears} Thn {formData.maximumAgeMonths} Bln
                          </td>
                        </tr>

                        {/* Effective From */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Tanggal Efektif</td>
                          <td className="py-2 px-4 text-right text-slate-500">
                            {activeParam ? formatDate(activeParam.effectiveFrom) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-bold text-indigo-700 bg-indigo-50/20">
                            {formatDate(formData.effectiveFrom)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalStep("form")}
                      data-testid="back-to-form-btn"
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      ← Kembali ke Form
                    </button>
                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={handleSubmitNewVersion}
                      data-testid="confirm-activate-btn"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Konfirmasi & Aktifkan Versi Baru</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
