"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth/auth-provider";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PercentageInput } from "@/components/ui/percentage-input";
import {
  Percent,
  Receipt,
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
  Coins,
  ShieldAlert,
  SlidersHorizontal,
  Landmark,
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

interface PaymentOfficeOption {
  id: string;
  code: string;
  name: string;
}

interface FeeParameterData {
  id: string;
  productId: string;
  paymentOfficeId?: string | null;
  version: string;
  adminRate: number;
  provisionRate: number;
  verificationFee: number;
  flaggingFee: number;
  frontingRate: number;
  reserveRate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdBy?: string;
  paymentOffice?: {
    id: string;
    code: string;
    name: string;
  } | null;
  createdAt: string;
}

export default function FeeManagementPage() {
  const { user: currentUser, hasPermission } = useAuth();

  // State: Reference options
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [paymentOffices, setPaymentOffices] = useState<PaymentOfficeOption[]>([]);
  const [selectedPaymentOfficeId, setSelectedPaymentOfficeId] = useState<string>("");
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);

  // State: Active Fee Parameter & History
  const [activeFee, setActiveFee] = useState<FeeParameterData | null>(null);
  const [versions, setVersions] = useState<FeeParameterData[]>([]);
  const [loadingFee, setLoadingFee] = useState<boolean>(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  // State: Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<"form" | "confirm">("form");
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [formData, setFormData] = useState({
    paymentOfficeId: "",
    adminRate: 0.01, // 1%
    provisionRate: 0.01, // 1%
    verificationFee: 1500000,
    flaggingFee: 38000,
    frontingRate: 0.0025, // 0.25%
    reserveRate: 0.005, // 0.50%
    effectiveFrom: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canCreateVersion =
    hasPermission("CREDIT_PARAMETER_CREATE") ||
    hasPermission("MASTER_CREATE") ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN";

  // 1. Fetch Products & Payment Offices
  const fetchReferenceData = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [prodRes, poRes] = await Promise.all([
        fetch("/api/v1/products"),
        fetch("/api/v1/payment-offices?status=ACTIVE"),
      ]);

      if (prodRes.ok) {
        const json = await prodRes.json();
        const list: ProductOption[] = json.data || [];
        setProducts(list);
        if (list.length > 0 && !selectedProductId) {
          setSelectedProductId(list[0].id);
        }
      }

      if (poRes.ok) {
        const poJson = await poRes.json();
        setPaymentOffices(poJson.data || []);
      }
    } catch (err) {
      console.error("Failed to load reference options:", err);
    } finally {
      setLoadingOptions(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  // 2. Fetch Active Fee Parameter & History
  const fetchFeeParameters = useCallback(async (prodId: string, poId?: string) => {
    if (!prodId) return;

    setLoadingFee(true);
    setFeeError(null);

    try {
      const poParam = poId ? `?paymentOfficeId=${poId}` : "";

      // Active Fee Parameter
      const activeRes = await fetch(`/api/v1/products/${prodId}/fee-parameters${poParam}`);
      if (activeRes.ok) {
        const json = await activeRes.json();
        setActiveFee(json.data);
      } else if (activeRes.status === 404) {
        setActiveFee(null);
      } else {
        const errJson = await activeRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal memuat parameter biaya aktif.");
      }

      // Versions History
      const versionsRes = await fetch(
        `/api/v1/products/${prodId}/fee-parameters/versions${poParam}`
      );
      if (versionsRes.ok) {
        const vJson = await versionsRes.json();
        setVersions(vJson.data || []);
      } else {
        setVersions([]);
      }
    } catch (err: any) {
      setFeeError(err.message || "Terjadi kesalahan saat memuat parameter biaya.");
    } finally {
      setLoadingFee(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      fetchFeeParameters(selectedProductId, selectedPaymentOfficeId);
    }
  }, [selectedProductId, selectedPaymentOfficeId, fetchFeeParameters]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalStep("form");
    setFormError(null);
    setFieldErrors({});

    if (activeFee) {
      setFormData({
        paymentOfficeId: selectedPaymentOfficeId || "",
        adminRate: activeFee.adminRate,
        provisionRate: activeFee.provisionRate,
        verificationFee: activeFee.verificationFee,
        flaggingFee: activeFee.flaggingFee,
        frontingRate: activeFee.frontingRate,
        reserveRate: activeFee.reserveRate,
        effectiveFrom: new Date().toISOString().split("T")[0],
        description: "",
      });
    } else {
      setFormData({
        paymentOfficeId: selectedPaymentOfficeId || "",
        adminRate: 0.01,
        provisionRate: 0.01,
        verificationFee: 1500000,
        flaggingFee: 38000,
        frontingRate: 0.0025,
        reserveRate: 0.005,
        effectiveFrom: new Date().toISOString().split("T")[0],
        description: "",
      });
    }

    setModalOpen(true);
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (formData.adminRate < 0 || formData.adminRate > 1.0) {
      errs.adminRate = "Tarif admin harus antara 0% hingga 100%.";
    }
    if (formData.provisionRate < 0 || formData.provisionRate > 1.0) {
      errs.provisionRate = "Tarif provisi harus antara 0% hingga 100%.";
    }
    if (formData.verificationFee < 0) {
      errs.verificationFee = "Biaya verifikasi tidak boleh negatif.";
    }
    if (formData.flaggingFee < 0) {
      errs.flaggingFee = "Biaya flagging tidak boleh negatif.";
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

  // Submit New Fee Version
  const handleSubmitNewVersion = async () => {
    if (!selectedProductId) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        paymentOfficeId: formData.paymentOfficeId ? formData.paymentOfficeId : undefined,
        adminRate: Number(formData.adminRate),
        provisionRate: Number(formData.provisionRate),
        verificationFee: Number(formData.verificationFee),
        flaggingFee: Number(formData.flaggingFee),
        frontingRate: Number(formData.frontingRate || 0),
        reserveRate: Number(formData.reserveRate || 0),
        effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
        description: formData.description.trim() || undefined,
      };

      const res = await fetch(
        `/api/v1/products/${selectedProductId}/fee-parameters/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || "Gagal mengaktifkan versi parameter biaya baru."
        );
      }

      setModalOpen(false);
      fetchFeeParameters(selectedProductId, selectedPaymentOfficeId);
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat menyimpan versi parameter biaya.");
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
              <Percent className="h-6 w-6 text-indigo-600" />
              <h1
                data-testid="fee-management-title"
                className="text-xl font-bold tracking-tight text-slate-900"
              >
                Master Parameter Biaya & Komponen Potongan
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Kelola struktur biaya administrasi, provisi, flagging, verifikasi, dan tarif pembagian premi per produk / kantor bayar.
            </p>
          </div>

          {/* Action CTA */}
          {canCreateVersion && selectedProductId && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              data-testid="create-fee-version-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              <span>+ Buat Versi Parameter Biaya Baru</span>
            </button>
          )}
        </div>

        {/* Product & Payment Office Selector Card */}
        <div
          data-testid="fee-selector-card"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
            {/* Product Select */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Pilih Produk Kredit
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                data-testid="select-product-fee"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) {p.bpr ? `— ${p.bpr.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Office Select */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Kantor Bayar (Opsional)
              </label>
              <select
                value={selectedPaymentOfficeId}
                onChange={(e) => setSelectedPaymentOfficeId(e.target.value)}
                data-testid="select-payment-office-fee"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                <option value="">Default (Semua Kantor Bayar)</option>
                {paymentOffices.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.name} ({po.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Product Overview details */}
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
        {loadingFee && (
          <div
            data-testid="fee-loading"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
          >
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              Memuat parameter biaya aktif dan riwayat versi...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loadingFee && feeError && (
          <div
            data-testid="fee-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"
          >
            <AlertTriangle className="mx-auto h-7 w-7 text-rose-600" />
            <h3 className="mt-2 text-xs font-bold text-rose-900">
              Gagal Memuat Parameter Biaya
            </h3>
            <p className="mt-1 text-xs text-rose-700">{feeError}</p>
            <button
              type="button"
              onClick={() => fetchFeeParameters(selectedProductId, selectedPaymentOfficeId)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Active Fee Parameter Display */}
        {!loadingFee && !feeError && (
          <div className="space-y-6">
            {activeFee ? (
              <div
                data-testid="active-fee-card"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
              >
                {/* Active Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          Parameter Biaya Aktif
                        </h2>
                        <span
                          data-testid="active-fee-version-badge"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold font-mono text-emerald-700"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Versi {activeFee.version} (AKTIF)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Berlaku Sejak:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatDate(activeFee.effectiveFrom)}
                        </span>{" "}
                        • Lingkup:{" "}
                        <span className="font-semibold text-indigo-700">
                          {activeFee.paymentOffice?.name || "Default (Semua Kantor Bayar)"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    <div>Waktu Dibuat: {formatDate(activeFee.createdAt)}</div>
                  </div>
                </div>

                {/* Structured Financial Fee Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Provisi */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Tarif Provisi (%)
                    </span>
                    <div
                      data-testid="active-fee-provision"
                      className="mt-1 text-xl font-bold font-mono text-indigo-950"
                    >
                      {formatPercent(activeFee.provisionRate)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Persentase dari plafon pinjaman
                    </p>
                  </div>

                  {/* Administrasi */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Tarif Administrasi (%)
                    </span>
                    <div
                      data-testid="active-fee-admin"
                      className="mt-1 text-xl font-bold font-mono text-indigo-950"
                    >
                      {formatPercent(activeFee.adminRate)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Persentase dari plafon pinjaman
                    </p>
                  </div>

                  {/* Verifikasi / Survey */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Biaya Verifikasi / Survey
                    </span>
                    <div
                      data-testid="active-fee-verification"
                      className="mt-1 text-xl font-bold font-mono text-slate-900"
                    >
                      {formatRupiah(activeFee.verificationFee)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Biaya tetap per pengajuan
                    </p>
                  </div>

                  {/* Flagging Fee */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Biaya Flagging
                    </span>
                    <div
                      data-testid="active-fee-flagging"
                      className="mt-1 text-xl font-bold font-mono text-slate-900"
                    >
                      {formatRupiah(activeFee.flaggingFee)}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Biaya pemblokiran rekening kantor bayar
                    </p>
                  </div>
                </div>

                {/* Secondary Rates (Fronting & Reserve) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Tarif Fronting Fee Asuransi:</span>
                    <p
                      data-testid="active-fee-fronting"
                      className="font-semibold font-mono text-slate-800 mt-0.5"
                    >
                      {formatPercent(activeFee.frontingRate, 4)} dari Premi Asuransi
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Tarif Cadangan Klaim (Reserve):</span>
                    <p
                      data-testid="active-fee-reserve"
                      className="font-semibold font-mono text-slate-800 mt-0.5"
                    >
                      {formatPercent(activeFee.reserveRate, 4)} dari Premi Asuransi
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                data-testid="fee-empty-state"
                className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"
              >
                <Receipt className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-bold text-slate-800">
                  Belum Ada Parameter Biaya Aktif
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Produk ini belum memiliki struktur parameter biaya aktif untuk kantor bayar yang dipilih.
                </p>
                {canCreateVersion && (
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="mt-4 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Inisialisasi Parameter Biaya Pertama</span>
                  </button>
                )}
              </div>
            )}

            {/* Historical Fee Versions Table */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Riwayat Versi Parameter Biaya (Audit Trail)
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  Total {versions.length} Versi
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table
                    data-testid="fee-versions-table"
                    className="w-full text-left text-xs border-collapse"
                  >
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Versi</th>
                        <th className="py-3 px-4">Kantor Bayar</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Periode Efektif</th>
                        <th className="py-3 px-4 text-right">Provisi</th>
                        <th className="py-3 px-4 text-right">Admin</th>
                        <th className="py-3 px-4 text-right">Verifikasi</th>
                        <th className="py-3 px-4 text-right">Flagging</th>
                        <th className="py-3 px-4">Dibuat Pada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {versions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            Belum ada riwayat versi parameter biaya.
                          </td>
                        </tr>
                      ) : (
                        versions.map((v) => (
                          <tr
                            key={v.id}
                            data-testid={`fee-version-row-${v.version}`}
                            className={cn(
                              "hover:bg-slate-50/80 transition-colors",
                              v.isActive ? "bg-emerald-50/20" : ""
                            )}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {v.version}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {v.paymentOffice?.name || "Default (Semua)"}
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
                              {formatPercent(v.provisionRate)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800">
                              {formatPercent(v.adminRate)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800">
                              {formatRupiah(v.verificationFee)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800">
                              {formatRupiah(v.flaggingFee)}
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

        {/* Create / Edit Fee Version Modal (DESIGN.md §21) */}
        {modalOpen && (
          <div
            data-testid="fee-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto"
          >
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <Percent className="h-5 w-5" />
                  </div>
                  <div>
                    <h2
                      data-testid="fee-modal-title"
                      className="text-base font-bold text-slate-900"
                    >
                      {modalStep === "form"
                        ? "Buat Versi Parameter Biaya Baru"
                        : "Konfirmasi Aktivasi Parameter Biaya"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {modalStep === "form"
                        ? "Versi parameter biaya aktif akan diarsipkan secara immutable."
                        : "Periksa kembali perbandingan rincian biaya lama vs baru."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  data-testid="close-fee-modal-btn"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Error Banner */}
              {formError && (
                <div
                  data-testid="fee-form-error-alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: FORM INPUT */}
              {modalStep === "form" && (
                <form onSubmit={handleProceedToConfirm} className="mt-4 space-y-4 text-xs">
                  {/* Payment Office Selection */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kantor Bayar (Opsional)
                    </label>
                    <select
                      value={formData.paymentOfficeId}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentOfficeId: e.target.value })
                      }
                      data-testid="input-fee-payment-office"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="">Default (Semua Kantor Bayar)</option>
                      {paymentOffices.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.name} ({po.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Provisi Rate */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tarif Provisi (%) <span className="text-rose-500">*</span>
                      </label>
                      <PercentageInput
                        value={formData.provisionRate}
                        isDecimalRatio={true}
                        decimals={2}
                        onChange={(val) => setFormData({ ...formData, provisionRate: val })}
                        error={fieldErrors.provisionRate}
                        helperText="Persentase provisi (misal: 1%)"
                        data-testid="input-fee-provision"
                      />
                    </div>

                    {/* Admin Rate */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tarif Administrasi (%) <span className="text-rose-500">*</span>
                      </label>
                      <PercentageInput
                        value={formData.adminRate}
                        isDecimalRatio={true}
                        decimals={2}
                        onChange={(val) => setFormData({ ...formData, adminRate: val })}
                        error={fieldErrors.adminRate}
                        helperText="Persentase administrasi (misal: 1%)"
                        data-testid="input-fee-admin"
                      />
                    </div>

                    {/* Biaya Verifikasi */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Biaya Verifikasi / Survey (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <CurrencyInput
                        value={formData.verificationFee}
                        onChange={(val) => setFormData({ ...formData, verificationFee: val })}
                        error={fieldErrors.verificationFee}
                        data-testid="input-fee-verification"
                      />
                    </div>

                    {/* Biaya Flagging */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Biaya Flagging (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <CurrencyInput
                        value={formData.flaggingFee}
                        onChange={(val) => setFormData({ ...formData, flaggingFee: val })}
                        error={fieldErrors.flaggingFee}
                        data-testid="input-fee-flagging"
                      />
                    </div>

                    {/* Fronting Rate */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tarif Fronting Fee Asuransi (%)
                      </label>
                      <PercentageInput
                        value={formData.frontingRate}
                        isDecimalRatio={true}
                        decimals={4}
                        onChange={(val) => setFormData({ ...formData, frontingRate: val })}
                        helperText="Bagian fee premi asuransi (misal: 0.25%)"
                        data-testid="input-fee-fronting"
                      />
                    </div>

                    {/* Reserve Rate */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tarif Cadangan Klaim (Reserve) (%)
                      </label>
                      <PercentageInput
                        value={formData.reserveRate}
                        isDecimalRatio={true}
                        decimals={4}
                        onChange={(val) => setFormData({ ...formData, reserveRate: val })}
                        helperText="Cadangan klaim asuransi (misal: 0.50%)"
                        data-testid="input-fee-reserve"
                      />
                    </div>
                  </div>

                  {/* Effective Date */}
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
                      data-testid="input-fee-effective-from"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Alasan / Catatan Perubahan Versi
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Pembaruan tarif biaya provisi & administrasi tahun 2026..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      data-testid="input-fee-description"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      data-testid="cancel-fee-modal-btn"
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      data-testid="proceed-fee-confirm-btn"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <span>Lanjut ke Konfirmasi</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: CONFIRMATION / DIFF PREVIEW */}
              {modalStep === "confirm" && (
                <div className="mt-4 space-y-4 text-xs">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-900 flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[12px]">Konfirmasi Pembaruan Parameter Biaya:</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">
                        Versi parameter biaya aktif saat ini akan diarsipkan. Semua simulasi kredit baru akan menggunakan potongan biaya versi ini.
                      </p>
                    </div>
                  </div>

                  {/* Diff Table */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Komponen Biaya</th>
                          <th className="py-2.5 px-4 text-right">Nilai Saat Ini</th>
                          <th className="py-2.5 px-4 text-center w-8"></th>
                          <th className="py-2.5 px-4 text-right bg-indigo-50/40 text-indigo-950 font-extrabold">
                            Nilai Baru
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {/* Provisi */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Tarif Provisi</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-500">
                            {activeFee ? formatPercent(activeFee.provisionRate) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                            {formatPercent(formData.provisionRate)}
                          </td>
                        </tr>

                        {/* Admin */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Tarif Administrasi</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-500">
                            {activeFee ? formatPercent(activeFee.adminRate) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                            {formatPercent(formData.adminRate)}
                          </td>
                        </tr>

                        {/* Verifikasi */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Biaya Verifikasi</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-500">
                            {activeFee ? formatRupiah(activeFee.verificationFee) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                            {formatRupiah(formData.verificationFee)}
                          </td>
                        </tr>

                        {/* Flagging */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Biaya Flagging</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-500">
                            {activeFee ? formatRupiah(activeFee.flaggingFee) : "-"}
                          </td>
                          <td className="py-2 px-4 text-center text-slate-400">→</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                            {formatRupiah(formData.flaggingFee)}
                          </td>
                        </tr>

                        {/* Effective From */}
                        <tr>
                          <td className="py-2 px-4 font-semibold text-slate-700">Tanggal Efektif</td>
                          <td className="py-2 px-4 text-right text-slate-500">
                            {activeFee ? formatDate(activeFee.effectiveFrom) : "-"}
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
                      data-testid="back-to-fee-form-btn"
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      ← Kembali ke Form
                    </button>
                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={handleSubmitNewVersion}
                      data-testid="confirm-activate-fee-btn"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Konfirmasi & Aktifkan Versi Biaya Baru</span>
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
