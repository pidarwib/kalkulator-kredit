"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout, PageHeader } from "@/components/layout";
import { ResultDetail } from "@/components/calculator/result-detail";
import { AmortizationTable } from "@/components/calculator/amortization-table";
import {
  Calculator,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  User,
  GitBranch,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Coins,
  Percent,
  Layers,
  Sparkles,
  Info,
  Clock,
  Briefcase,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SimulationDetailData {
  id: string;
  simulationNumber: string;
  status: string;
  customerName: string;
  customerNip?: string;
  calculationMethod: string;
  businessRuleVersion: string;
  parameterVersion: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName?: string;
    name?: string;
    username?: string;
    email?: string;
    role?: string;
  };
  bpr?: {
    id: string;
    code: string;
    name: string;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  paymentOffice?: {
    id: string;
    code: string;
    name: string;
  };
  product?: {
    id: string;
    code: string;
    name: string;
    calculationMethod?: string;
  };
  input: any;
  result: {
    maximumPrincipal: number;
    installment: number;
    dbr: number;
    remainingSalary: number;
    totalFees?: number;
    flaggingFee?: number;
    payoffAmount?: number;
    netDisbursement?: number;
    interestMonthly?: number;
    principalMonthly?: number;
  };
  breakdown?: any;
  insurance?: {
    rate: number;
    premium: number;
    fronting: number;
    reserve: number;
  };
  fees?: {
    admin: number;
    provision: number;
    verification: number;
    flagging: number;
    installmentDeduction: number;
  };
  versions: {
    businessRule: string;
    parameter: string;
  };
  reasons?: string[];
  warnings?: string[];
  schedule: Array<{
    period: number;
    paymentDate?: string | null;
    openingBalance: number;
    principalPortion?: number;
    principal?: number;
    interestPortion?: number;
    interest?: number;
    installment: number;
    closingBalance: number;
  }>;
}

export default function SimulationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const simulationId = params?.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SimulationDetailData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchSimulationDetail = useCallback(async () => {
    if (!simulationId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/simulations/${simulationId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Simulasi tidak ditemukan atau telah dihapus.");
        } else if (res.status === 403) {
          throw new Error("Anda tidak memiliki izin untuk melihat data simulasi ini.");
        } else {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            errBody.error?.message || "Gagal memuat detail simulasi."
          );
        }
      }

      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data simulasi.");
    } finally {
      setLoading(false);
    }
  }, [simulationId]);

  useEffect(() => {
    fetchSimulationDetail();
  }, [fetchSimulationDetail]);

  const handleCopyNumber = () => {
    if (!data?.simulationNumber) return;
    navigator.clipboard.writeText(data.simulationNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
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
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const isEligible = data?.status === "SAVED" || data?.status === "OK" || (data?.reasons?.length === 0);

  // Prepare standard props for ResultDetail
  const resultDetailData = data
    ? {
        status: isEligible ? "OK" : "OVER",
        isEligible,
        calculationMethod: data.calculationMethod,
        input: data.input || {},
        result: {
          ...data.result,
          maximumPrincipal: data.result?.maximumPrincipal || data.input?.requestedPrincipal || 0,
          installment: data.result?.installment || 0,
          dbr: data.result?.dbr || 0,
          remainingSalary: data.result?.remainingSalary || 0,
          netDisbursement: data.result?.netDisbursement || 0,
        },
        breakdown: data.breakdown || {
          adminFee: data.fees?.admin || 0,
          provisionFee: data.fees?.provision || 0,
          insuranceCharge: data.insurance?.premium || 0,
          verificationFee: data.fees?.verification || 0,
          flaggingFee: data.fees?.flagging || 0,
          settlementPayoff: data.input?.settlementPayoff || 0,
          holdInstallment: data.fees?.installmentDeduction || 0,
          otherFee: data.input?.otherFee || 0,
          totalDeductions: data.result?.totalFees || 0,
        },
        insurance: data.insurance || {
          rate: 0,
          premium: 0,
          frontingFee: 0,
          reserveFund: 0,
        },
        fees: data.fees || {},
        reasons: data.reasons || [],
      }
    : null;

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/simulations"
              data-testid="back-to-simulations-btn"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  data-testid="simulation-detail-title"
                  className="text-xl font-bold tracking-tight text-slate-900"
                >
                  Detail Simulasi Kredit
                </h1>
                {data && (
                  <span
                    data-testid="simulation-status-badge"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                      isEligible
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    )}
                  >
                    {isEligible ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>ELIGIBLE</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>OVER CAPACITY</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              {data && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span className="font-mono font-medium text-slate-700">
                    {data.simulationNumber}
                  </span>
                  <span>•</span>
                  <span>Dibuat: {formatDate(data.createdAt)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {data && (
              <>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  data-testid="copy-simulation-number-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Salin No. Simulasi</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  data-testid="print-simulation-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Cetak / PDF</span>
                </button>
              </>
            )}

            <Link
              href="/calculator"
              data-testid="new-calculation-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Simulasi Baru</span>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            data-testid="simulation-detail-loading"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm"
          >
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Memuat data simulasi kredit...
            </p>
            <p className="text-xs text-slate-400">
              Mengambil parameter snapshot, hasil perhitungan, dan jadwal amortisasi.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            data-testid="simulation-detail-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"
          >
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
            <h3 className="mt-2 text-sm font-bold text-rose-900">
              Gagal Memuat Detail Simulasi
            </h3>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={fetchSimulationDetail}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                Coba Lagi
              </button>
              <Link
                href="/simulations"
                className="rounded-lg border border-rose-300 bg-white px-4 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 transition-colors"
              >
                Kembali ke Daftar
              </Link>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Metadata & Audit Card */}
            <div
              data-testid="simulation-meta-card"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Creator */}
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Dibuat Oleh
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {data.user?.fullName || data.user?.name || data.user?.username || "-"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Role: <span className="font-semibold">{data.user?.role || "MARKETING"}</span>
                    </p>
                  </div>
                </div>

                {/* Institution & Branch */}
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Institusi / Cabang
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {data.bpr?.name || "BPR Pusat"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Cabang: {data.branch?.name || "Kantor Pusat"}
                    </p>
                  </div>
                </div>

                {/* Parameter Version */}
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Versi Parameter
                    </p>
                    <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                      {data.parameterVersion || data.versions?.parameter || "v1"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Rule: {data.businessRuleVersion || data.versions?.businessRule || "BR-1.0"}
                    </p>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Waktu Pembuatan
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {formatDate(data.createdAt)}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium">
                      ✓ Snapshot Terverifikasi
                    </p>
                  </div>
                </div>
              </div>

              {/* Version & Immutability Notice Banner */}
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Snapshot Data Finansial:</strong> Simulasi ini menyimpan parameter snapshot historis (Versi Parameter: <span className="font-mono font-semibold">{data.parameterVersion || "v1"}</span>, Aturan Bisnis: <span className="font-mono font-semibold">{data.businessRuleVersion || "BR-1.0"}</span>). Rekonstruksi perhitungan tetap akurat dan tidak akan berubah meskipun master parameter di masa depan diperbarui.
                </p>
              </div>
            </div>

            {/* Customer & Loan Input Snapshot */}
            <div
              data-testid="simulation-input-card"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Data Nasabah & Parameter Pengajuan
                  </h3>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Input Snapshot
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-xs">
                <div>
                  <span className="text-slate-400">Nama Nasabah:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.customerName || data.input?.customerName || "-"}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">NIP / Nomor Pegawai:</span>
                  <p className="font-semibold font-mono text-slate-800 mt-0.5">
                    {data.customerNip || data.input?.customerNip || "-"}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">Tanggal Lahir / Usia:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.input?.birthDate ? `${data.input.birthDate}` : "-"}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">Gaji Bersih Bulanan:</span>
                  <p className="font-semibold font-mono text-slate-900 mt-0.5">
                    {formatRupiah(data.input?.netSalary)}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">Penghasilan Tambahan:</span>
                  <p className="font-semibold font-mono text-slate-900 mt-0.5">
                    {formatRupiah(data.input?.otherIncome || 0)}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">Kantor Bayar:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.paymentOffice?.name || data.input?.paymentOfficeId || "-"}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">Produk Kredit:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.product?.name || data.input?.productId || "Kredit Pegawai"}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">Metode Perhitungan:</span>
                  <p className="font-semibold text-indigo-700 mt-0.5">
                    {data.calculationMethod || data.input?.calculationMethod || "FLAT"}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400">Jangka Waktu (Tenor):</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {data.input?.tenorMonths || 0} Bulan (
                    {Math.floor((data.input?.tenorMonths || 0) / 12)} Thn{" "}
                    {(data.input?.tenorMonths || 0) % 12 > 0
                      ? `${(data.input?.tenorMonths || 0) % 12} Bln`
                      : ""}
                    )
                  </p>
                </div>
              </div>
            </div>

            {/* Primary KPI Result Cards */}
            <div
              data-testid="simulation-kpi-summary"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {/* Plafon Maksimal */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Plafon Maksimal
                  </span>
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <Calculator className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {formatRupiah(data.result?.maximumPrincipal)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pengajuan: {formatRupiah(data.input?.requestedPrincipal)}
                  </p>
                </div>
              </div>

              {/* Angsuran Bulanan */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Angsuran Bulanan
                  </span>
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <Coins className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-bold font-mono text-blue-900">
                    {formatRupiah(data.result?.installment)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tenor {data.input?.tenorMonths} Bulan
                  </p>
                </div>
              </div>

              {/* DBR */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Debt Burden Ratio (DBR)
                  </span>
                  <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-bold font-mono text-purple-900">
                    {formatPercent(data.result?.dbr)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Sisa Gaji: {formatRupiah(data.result?.remainingSalary)}
                  </p>
                </div>
              </div>

              {/* Estimasi Terima Bersih */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Estimasi Terima Bersih
                  </span>
                  <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-bold font-mono text-emerald-700">
                    {isEligible
                      ? formatRupiah(data.result?.netDisbursement)
                      : "-"}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Setelah biaya & asuransi
                  </p>
                </div>
              </div>
            </div>

            {/* Over Capacity Alert Reasons */}
            {!isEligible && data.reasons && data.reasons.length > 0 && (
              <div
                data-testid="simulation-over-reasons-alert"
                className="rounded-2xl border border-rose-200 bg-rose-50/90 p-5 text-xs text-rose-900"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-rose-950 mb-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span>Catatan Kelayakan (Over Capacity):</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-rose-800 font-medium">
                  {data.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Result Breakdown (Tabs) */}
            {resultDetailData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Rincian Perhitungan Komprehensif
                  </h2>
                </div>
                <ResultDetail data={resultDetailData} />
              </div>
            )}

            {/* Amortization Schedule Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Jadwal Amortisasi Angsuran
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  Total {data.schedule?.length || 0} Periode
                </span>
              </div>

              <AmortizationTable
                schedule={data.schedule || []}
                calculationMethod={data.calculationMethod}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
