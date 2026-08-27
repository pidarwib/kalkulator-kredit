"use client";

import React, { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { CalculatorForm, CalculatorFormValues } from "@/components/calculator/calculator-form";
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Percent,
  Receipt,
} from "lucide-react";

export default function CalculatorPage() {
  const [calculationResult, setCalculationResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCalculate = async (values: CalculatorFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/calculations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const json = await response.json();

      if (!response.ok) {
        const errorMsg =
          json?.error?.message ||
          "Gagal melakukan perhitungan kredit. Periksa parameter yang dimasukkan.";
        setErrorMessage(errorMsg);
        setCalculationResult(null);
        return;
      }

      setCalculationResult(json.data);
    } catch (err) {
      console.error("[Calculator Page] Calculation error:", err);
      setErrorMessage("Terjadi kesalahan jaringan atau server saat memproses perhitungan.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Kalkulator Kredit"
        description="Authoritative Credit Engine untuk perhitungan angsuran, kapasitas DBR, dan kelayakan debitur BPR."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Kalkulator Kredit" },
        ]}
      />

      <div className="space-y-6 pb-12">
        {/* Error Alert */}
        {errorMessage && (
          <div
            data-testid="calculator-error-banner"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold">Perhitungan Tidak Dapat Dilanjutkan</h4>
              <p className="mt-0.5 text-xs text-red-700 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* The Calculator Input Form */}
        <CalculatorForm
          onCalculate={handleCalculate}
          isLoading={isLoading}
        />

        {/* Calculation Result Summary Box (Instant Feedback) */}
        {calculationResult && (
          <div
            data-testid="calculation-summary-result"
            className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8 animate-in fade-in duration-300"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
                    calculationResult.isEligible ? "bg-emerald-600" : "bg-amber-600"
                  }`}
                >
                  {calculationResult.isEligible ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <ShieldAlert className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Hasil Analisis Kelayakan
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        calculationResult.isEligible
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      Status: {calculationResult.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Metode: {calculationResult.calculationMethod} • Versi Aturan:{" "}
                    {calculationResult.versions?.businessRule}
                  </p>
                </div>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Angsuran Bulanan */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Angsuran Bulanan
                </span>
                <div className="mt-2 text-xl font-extrabold text-indigo-950">
                  {formatRupiah(calculationResult.result.installment)}
                </div>
                <span className="text-[11px] text-indigo-600">
                  Tenor {calculationResult.input.tenorMonths} bulan
                </span>
              </div>

              {/* Debt Burden Ratio */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Debt Burden Ratio (DBR)
                </span>
                <div className="mt-2 text-xl font-extrabold text-slate-900">
                  {(calculationResult.result.dbr * 100).toFixed(2)}%
                </div>
                <span className="text-[11px] text-slate-500">
                  Sisa Gaji: {formatRupiah(calculationResult.result.remainingSalary)}
                </span>
              </div>

              {/* Plafon Maksimal */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Plafon Maksimal
                </span>
                <div className="mt-2 text-xl font-extrabold text-slate-900">
                  {formatRupiah(calculationResult.result.maximumPrincipal)}
                </div>
                <span className="text-[11px] text-slate-500">Kapasitas Maksimal Debitur</span>
              </div>

              {/* Terima Bersih */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Estimasi Terima Bersih
                </span>
                <div className="mt-2 text-xl font-extrabold text-emerald-950">
                  {formatRupiah(calculationResult.result.netDisbursement)}
                </div>
                <span className="text-[11px] text-emerald-600">
                  Setelah potongan biaya & premi
                </span>
              </div>
            </div>

            {/* Eligibility Warnings / Reasons */}
            {calculationResult.reasons && calculationResult.reasons.length > 0 && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Catatan Batasan Kelayakan:
                </h4>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-amber-800">
                  {calculationResult.reasons.map((reason: string, idx: number) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
