"use client";

import React, { useState } from "react";
import {
  FileText,
  ShieldCheck,
  Calculator,
  ShieldAlert,
  Coins,
  Percent,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResultDetailProps {
  data: any;
  className?: string;
}

export function ResultDetail({ data, className }: ResultDetailProps) {
  const [activeTab, setActiveTab] = useState<
    "ringkasan" | "kelayakan" | "angsuran" | "asuransi" | "biaya" | "terimaBersih"
  >("ringkasan");

  const isEligible = data.isEligible || data.status === "OK";

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

  const tabs = [
    { id: "ringkasan", label: "Ringkasan", icon: FileText },
    { id: "kelayakan", label: "Kelayakan", icon: isEligible ? ShieldCheck : ShieldAlert },
    { id: "angsuran", label: "Angsuran", icon: Calculator },
    { id: "asuransi", label: "Asuransi", icon: ShieldCheck },
    { id: "biaya", label: "Rincian Biaya", icon: Receipt },
    { id: "terimaBersih", label: "Terima Bersih", icon: Coins },
  ];

  // Helper values extraction
  const input = data.input || {};
  const result = data.result || {};
  const insurance = data.insurance || {};
  const fees = data.fees || {};
  const breakdown = data.breakdown || {};
  const age = breakdown.age || {};
  const tenor = breakdown.tenor || {};
  const interest = breakdown.interest || {};

  return (
    <div
      data-testid="result-detail-container"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Tab Navigation Header */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-bold whitespace-nowrap transition-colors focus:outline-none",
                isActive
                  ? "border-indigo-600 bg-white text-indigo-700 shadow-sm"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="p-6 sm:p-8">
        {/* 1. TAB RINGKASAN */}
        {activeTab === "ringkasan" && (
          <div data-testid="tab-content-ringkasan" className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Ringkasan Pengajuan & Finansial</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Applicant & Facility Info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Data Pemohon & Pinjaman
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nama Nasabah</span>
                    <span className="font-semibold text-slate-900">{input.customerName || "-"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">NIP / Identitas</span>
                    <span className="font-semibold text-slate-900">{input.customerNip || "-"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Tanggal Lahir / Usia</span>
                    <span className="font-semibold text-slate-900">
                      {input.birthDate} ({age.currentYears || "-"} thn {age.currentMonths || 0} bln)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Plafon Dimohon</span>
                    <span className="font-bold text-indigo-900">{formatRupiah(input.requestedPrincipal)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Tenor & Metode</span>
                    <span className="font-semibold text-slate-900">
                      {input.tenorMonths} Bulan ({data.calculationMethod})
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial & Capacity Info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Data Finansial & Kapasitas
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Gaji Bersih Bulanan</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(input.netSalary)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Penghasilan Tambahan</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(input.otherIncome)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Potongan Pinjaman Luar</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(input.otherDeductions)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Angsuran Kredit BPR</span>
                    <span className="font-bold text-indigo-900">{formatRupiah(result.installment)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Sisa Gaji Setelah Angsuran</span>
                    <span className="font-bold text-emerald-900">{formatRupiah(result.remainingSalary)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TAB KELAYAKAN */}
        {activeTab === "kelayakan" && (
          <div data-testid="tab-content-kelayakan" className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              {isEligible ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-600" />
              )}
              <span>Analisis Kelayakan & Batasan Regulasi</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* DBR Capacity */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Debt Burden Ratio
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {formatPercent(result.dbr)}
                  </span>
                  <span className="text-xs text-slate-500">/ Maks 90%</span>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-1.5 rounded-full",
                      result.dbr > 0.9 ? "bg-amber-600" : "bg-indigo-600"
                    )}
                    style={{ width: `${Math.min(result.dbr * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Status: {result.dbr <= 0.9 ? "Dalam batas aman" : "Melebihi batas 90%"}
                </p>
              </div>

              {/* Age Bounds */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Evaluasi Batas Usia
                </span>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                  {age.ageAtMaturityYears || "-"} <span className="text-sm font-normal text-slate-500">tahun</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Usia saat jatuh tempo (Batas maks {age.maxAgeLimit || 85} thn)
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Usia pengajuan: {age.currentYears || "-"} tahun
                </p>
              </div>

              {/* Max Principal Capacity */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Kapasitas Plafon Maksimal
                </span>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">
                  {formatRupiah(result.maximumPrincipal)}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Plafon diajukan: {formatRupiah(input.requestedPrincipal)}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Berdasarkan DBR maksimal & tenor
                </p>
              </div>
            </div>

            {/* Reasons or Eligibility summary */}
            {!isEligible && data.reasons && data.reasons.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                  <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Catatan Faktor Over Capacity:
                  </h5>
                </div>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-amber-900">
                  {data.reasons.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 3. TAB ANGSURAN */}
        {activeTab === "angsuran" && (
          <div data-testid="tab-content-angsuran" className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-indigo-600" />
              <span>Perhitungan Angsuran & Margin ({data.calculationMethod})</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Struktur Suku Bunga & Pokok
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Pokok Pinjaman</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(input.requestedPrincipal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Margin Tahunan</span>
                    <span className="font-semibold text-slate-900">{formatPercent(interest.annualRate || 0.108)} p.a.</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Margin Bulanan</span>
                    <span className="font-semibold text-slate-900">{formatPercent(interest.monthlyRate || 0.009)} / bln</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Jangka Waktu (Tenor)</span>
                    <span className="font-semibold text-slate-900">{input.tenorMonths} Bulan</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                  Rincian Angsuran Per Bulan
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-indigo-200/60">
                    <span className="text-indigo-700">Angsuran Pokok</span>
                    <span className="font-semibold text-indigo-950">
                      {formatRupiah(result.principalMonthly || input.requestedPrincipal / input.tenorMonths)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-200/60">
                    <span className="text-indigo-700">Angsuran Margin / Bunga</span>
                    <span className="font-semibold text-indigo-950">
                      {formatRupiah(result.interestMonthly || result.installment - (input.requestedPrincipal / input.tenorMonths))}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b-2 border-indigo-300">
                    <span className="font-bold text-indigo-900">Total Angsuran Bulanan</span>
                    <span className="font-extrabold text-indigo-950 text-sm">
                      {formatRupiah(result.installment)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-indigo-700">Total Pembayaran (Plafon + Bunga)</span>
                    <span className="font-bold text-indigo-950">
                      {formatRupiah(result.totalRepayment || result.installment * input.tenorMonths)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. TAB ASURANSI */}
        {activeTab === "asuransi" && (
          <div data-testid="tab-content-asuransi" className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>Rincian Struktur Premi & Biaya Asuransi Jiwa</span>
            </h4>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 max-w-2xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <div>
                  <div className="text-xs font-bold text-slate-900">Tarif Premi Asuransi Jiwa</div>
                  <div className="text-[11px] text-slate-500">Berdasarkan usia masuk {age.currentYears || "-"} thn & tenor {tenor.insuranceYears || Math.ceil(input.tenorMonths / 12)} thn</div>
                </div>
                <div className="text-sm font-extrabold text-indigo-700">
                  {formatPercent(insurance.rate, 3)}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Premi Jiwa Murni</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(insurance.premium)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Fee Fronting</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(insurance.fronting)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Dana Pencadangan</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(insurance.reserve)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-300 font-bold text-slate-900">
                  <span>Total Biaya Asuransi</span>
                  <span className="font-extrabold text-sm text-indigo-900">{formatRupiah(insurance.total || insurance.premium)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. TAB BIAYA */}
        {activeTab === "biaya" && (
          <div data-testid="tab-content-biaya" className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              <span>Rincian Biaya Administrasi & Potongan Pencairan</span>
            </h4>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 max-w-2xl space-y-3">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Biaya Administrasi</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(fees.admin)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Biaya Provisi</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(fees.provision)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Biaya Asuransi</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(insurance.total || fees.insurance)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Biaya Verifikasi</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(fees.verification)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Biaya Flagging</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(fees.flagging)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Potongan Angsuran di Muka (Hold Angsuran)</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(fees.installmentDeduction)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Pelunasan Fasilitas Lain (Takeover)</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(input.settlementPayoff || result.payoffAmount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Biaya Lain-Lain</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(input.otherFee || fees.other)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-300 font-bold text-slate-900">
                  <span>Total Potongan Biaya</span>
                  <span className="font-extrabold text-sm text-red-700">{formatRupiah(result.totalFees || fees.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. TAB TERIMA BERSIH */}
        {activeTab === "terimaBersih" && (
          <div data-testid="tab-content-terima-bersih" className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-600" />
              <span>Estimasi Penerimaan Dana Bersih (Net Disbursement)</span>
            </h4>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-6 max-w-2xl space-y-4">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-emerald-200/60">
                  <span className="font-semibold text-slate-700">Plafon Pinjaman Dimohon</span>
                  <span className="font-bold text-slate-900 text-sm">{formatRupiah(input.requestedPrincipal)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-emerald-200/60 text-red-700">
                  <span className="font-semibold">Total Biaya & Potongan Pelunasan (-)</span>
                  <span className="font-bold text-sm">
                    {formatRupiah(result.totalFees || fees.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-emerald-300">
                  <div>
                    <div className="text-sm font-extrabold text-emerald-950">
                      Estimasi Dana Bersih Diterima
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Ditransfer langsung ke rekening nasabah setelah akad
                    </div>
                  </div>
                  <div
                    data-testid="net-disbursement-value"
                    className="text-2xl font-extrabold text-emerald-950"
                  >
                    {!isEligible ? (
                      <span title="Status Over Capacity">-</span>
                    ) : (
                      formatRupiah(result.netDisbursement)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
