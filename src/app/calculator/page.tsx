"use client";

import React, { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { CalculatorForm, CalculatorFormValues } from "@/components/calculator/calculator-form";
import { ResultSummary, CalculationResultData } from "@/components/calculator/result-summary";
import { ResultDetail } from "@/components/calculator/result-detail";
import { AmortizationTable } from "@/components/calculator/amortization-table";
import { AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CalculatorPage() {
  const [calculationResult, setCalculationResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSimulation, setSavedSimulation] = useState<{
    id: string;
    simulationNumber: string;
  } | null>(null);

  const handleCalculate = async (values: CalculatorFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavedSimulation(null);

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

  const handleSaveSimulation = async () => {
    if (!calculationResult || savedSimulation) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        customerName: calculationResult.input.customerName || "Nasabah Tanpa Nama",
        customerNip: calculationResult.input.customerNip,
        birthDate: calculationResult.input.birthDate,
        netSalary: calculationResult.input.netSalary,
        otherIncome: calculationResult.input.otherIncome || 0,
        otherDeductions: calculationResult.input.otherDeductions || 0,
        productId: calculationResult.input.productId,
        paymentOfficeId: calculationResult.input.paymentOfficeId,
        requestedPrincipal: calculationResult.input.requestedPrincipal,
        tenorMonths: calculationResult.input.tenorMonths,
        calculationMethod: calculationResult.calculationMethod,
        settlementPayoff: calculationResult.input.settlementPayoff || 0,
        otherFee: calculationResult.input.otherFee || 0,
      };

      const res = await fetch("/api/v1/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json?.error?.message || "Gagal menyimpan simulasi kredit.");
        return;
      }

      setSavedSimulation({
        id: json.data.id,
        simulationNumber: json.data.simulationNumber,
      });
      setSuccessMessage(
        `Simulasi berhasil disimpan dengan Nomor: ${json.data.simulationNumber}`
      );
    } catch (err) {
      console.error("[Calculator Page] Save simulation error:", err);
      setErrorMessage("Terjadi kesalahan saat menyimpan simulasi.");
    } finally {
      setIsSaving(false);
    }
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
        {/* Success Alert */}
        {successMessage && savedSimulation && (
          <div
            data-testid="calculator-success-banner"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 animate-in fade-in duration-200"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Simulasi Tersimpan</h4>
                <p className="mt-0.5 text-xs text-emerald-700 leading-relaxed">{successMessage}</p>
              </div>
            </div>

            <Link
              href={`/simulations/${savedSimulation.id}`}
              data-testid="banner-view-simulation-link"
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition-colors"
            >
              <span>Buka Detail Simulasi</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            data-testid="calculator-error-banner"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-in fade-in duration-200"
            role="alert"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold">Perhitungan / Penyimpanan Tidak Dapat Dilanjutkan</h4>
              <p className="mt-0.5 text-xs text-red-700 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* The Calculator Input Form */}
        <CalculatorForm
          onCalculate={handleCalculate}
          isLoading={isLoading}
        />

        {/* Dedicated Result Summary, Detail Breakdown & Amortization Table */}
        {calculationResult && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <ResultSummary
              data={calculationResult}
              onSaveSimulation={handleSaveSimulation}
              isSaving={isSaving}
              isSaved={!!savedSimulation}
              savedSimulationId={savedSimulation?.id}
            />

            <ResultDetail data={calculationResult} />

            {calculationResult.schedule && calculationResult.schedule.length > 0 && (
              <AmortizationTable
                schedule={calculationResult.schedule}
                calculationMethod={calculationResult.calculationMethod}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
