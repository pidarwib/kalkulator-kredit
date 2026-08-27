"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Calculator,
  Percent,
  Coins,
  BookmarkPlus,
  Loader2,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalculationResultData {
  status: "OK" | "OVER" | string;
  isEligible: boolean;
  calculationMethod: "FLAT" | "ANNUITY" | string;
  input: {
    customerName?: string;
    customerNip?: string;
    birthDate: string;
    netSalary: number;
    otherIncome?: number;
    otherDeductions?: number;
    productId: string;
    paymentOfficeId?: string;
    requestedPrincipal: number;
    tenorMonths: number;
    settlementPayoff?: number;
    otherFee?: number;
  };
  result: {
    installment: number;
    dbr: number;
    remainingSalary: number;
    maximumPrincipal: number;
    netDisbursement: number;
    interestMonthly?: number;
    principalMonthly?: number;
    totalInterest?: number;
    totalRepayment?: number;
    totalFee?: number;
    insurancePremium?: number;
  };
  breakdown?: {
    adminFee: number;
    provisionFee: number;
    insuranceCharge: number;
    verificationFee: number;
    flaggingFee: number;
    settlementPayoff: number;
    holdInstallment: number;
    otherFee: number;
    totalDeductions: number;
  };
  versions?: {
    businessRule: string;
    productParameter?: string;
    insuranceTable?: string;
    feeParameter?: string;
  };
  reasons?: string[];
}

interface ResultSummaryProps {
  data: CalculationResultData;
  onSaveSimulation?: () => Promise<void>;
  isSaving?: boolean;
  className?: string;
}

export function ResultSummary({
  data,
  onSaveSimulation,
  isSaving = false,
  className,
}: ResultSummaryProps) {
  const isEligible = data.isEligible || data.status === "OK";
  const dbrPercent = (data.result.dbr * 100).toFixed(2);

  const formatRupiah = (val: number | null | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      data-testid="calculation-summary-result"
      className={cn(
        "rounded-2xl border bg-white p-6 shadow-sm sm:p-8 transition-all animate-in fade-in duration-300",
        isEligible ? "border-emerald-200/80 shadow-emerald-500/5" : "border-amber-200/80 shadow-amber-500/5",
        className
      )}
    >
      {/* Header with Status Badge and Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-sm",
              isEligible ? "bg-emerald-600 shadow-emerald-200" : "bg-amber-600 shadow-amber-200"
            )}
          >
            {isEligible ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : (
              <ShieldAlert className="h-7 w-7" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                Hasil Analisis Kelayakan
              </h3>
              <span
                data-testid="status-badge"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-wide border",
                  isEligible
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                )}
              >
                {isEligible ? "✓ ELIGIBLE (MEMENUHI SYARAT)" : "! NOT ELIGIBLE (OVER CAPACITY)"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Metode: <span className="font-semibold text-slate-700">{data.calculationMethod}</span> • Versi Aturan:{" "}
              <span className="font-semibold text-slate-700">{data.versions?.businessRule || "v1.0.0"}</span>
            </p>
          </div>
        </div>

        {onSaveSimulation && (
          <button
            type="button"
            onClick={onSaveSimulation}
            disabled={isSaving}
            data-testid="save-simulation-btn"
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="h-4 w-4" />
                <span>Simpan Sebagai Simulasi</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Primary KPI Result Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Plafon Maksimal */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Plafon Maksimal
            </span>
            <Wallet className="h-4 w-4 text-slate-400" />
          </div>
          <div
            data-testid="kpi-maximum-principal"
            className="mt-2 text-xl font-extrabold text-slate-900"
          >
            {formatRupiah(data.result.maximumPrincipal)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Berdasarkan batas DBR & kapasitas gaji
          </p>
        </div>

        {/* 2. Angsuran Bulanan */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Angsuran Bulanan
            </span>
            <Calculator className="h-4 w-4 text-indigo-600" />
          </div>
          <div
            data-testid="kpi-installment"
            className="mt-2 text-xl font-extrabold text-indigo-950"
          >
            {formatRupiah(data.result.installment)}
          </div>
          <p className="mt-1 text-[11px] text-indigo-700 font-medium">
            Tenor {data.input.tenorMonths} bulan ({data.calculationMethod})
          </p>
        </div>

        {/* 3. Debt Burden Ratio (DBR) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Debt Burden Ratio (DBR)
            </span>
            <Percent className="h-4 w-4 text-slate-400" />
          </div>
          <div
            data-testid="kpi-dbr"
            className={cn(
              "mt-2 text-xl font-extrabold",
              data.result.dbr > 0.9 ? "text-amber-700" : "text-slate-900"
            )}
          >
            {dbrPercent}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Sisa Gaji: {formatRupiah(data.result.remainingSalary)}
          </p>
        </div>

        {/* 4. Estimasi Terima Bersih */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Estimasi Terima Bersih
            </span>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <div
            data-testid="kpi-net-disbursement"
            className="mt-2 text-xl font-extrabold text-emerald-950"
          >
            {formatRupiah(data.result.netDisbursement)}
          </div>
          <p className="mt-1 text-[11px] text-emerald-700">
            Setelah potongan premi asuransi & biaya
          </p>
        </div>
      </div>

      {/* OVER / Failure Reasons Section */}
      {!isEligible && data.reasons && data.reasons.length > 0 && (
        <div
          data-testid="eligibility-reasons-box"
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Catatan Batasan & Alasan Not Eligible (OVER):
            </h4>
          </div>
          <ul className="mt-2.5 list-disc list-inside space-y-1.5 text-xs text-amber-900 pl-1">
            {data.reasons.map((reason, idx) => (
              <li key={idx} className="font-medium">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
