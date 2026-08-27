"use client";

import React, { useState, useEffect } from "react";
import {
  Calculator,
  User,
  Calendar,
  DollarSign,
  Layers,
  Building2,
  Clock,
  Percent,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalculatorFormValues {
  customerName?: string;
  customerNip?: string;
  birthDate: string;
  netSalary: number;
  otherIncome: number;
  otherDeductions: number;
  productId: string;
  paymentOfficeId?: string;
  requestedPrincipal: number;
  tenorMonths: number;
  calculationMethod: "FLAT" | "ANNUITY";
  settlementPayoff: number;
  otherFee: number;
}

export interface ProductOption {
  id: string;
  code: string;
  name: string;
  bprId: string;
  bpr?: { name: string };
}

export interface PaymentOfficeOption {
  id: string;
  code: string;
  name: string;
  type?: string;
}

interface CalculatorFormProps {
  onCalculate: (values: CalculatorFormValues) => Promise<void>;
  isLoading?: boolean;
  initialValues?: Partial<CalculatorFormValues>;
  className?: string;
}

export function CalculatorForm({
  onCalculate,
  isLoading = false,
  initialValues,
  className,
}: CalculatorFormProps) {
  // Form State
  const [customerName, setCustomerName] = useState(initialValues?.customerName || "");
  const [customerNip, setCustomerNip] = useState(initialValues?.customerNip || "");
  const [birthDate, setBirthDate] = useState(initialValues?.birthDate || "1975-01-01");
  const [netSalary, setNetSalary] = useState<number>(initialValues?.netSalary || 8500000);
  const [otherIncome, setOtherIncome] = useState<number>(initialValues?.otherIncome || 0);
  const [otherDeductions, setOtherDeductions] = useState<number>(initialValues?.otherDeductions || 0);
  const [productId, setProductId] = useState(initialValues?.productId || "");
  const [paymentOfficeId, setPaymentOfficeId] = useState(initialValues?.paymentOfficeId || "");
  const [requestedPrincipal, setRequestedPrincipal] = useState<number>(
    initialValues?.requestedPrincipal || 100000000
  );
  const [tenorMonths, setTenorMonths] = useState<number>(initialValues?.tenorMonths || 60);
  const [calculationMethod, setCalculationMethod] = useState<"FLAT" | "ANNUITY">(
    initialValues?.calculationMethod || "FLAT"
  );
  const [settlementPayoff, setSettlementPayoff] = useState<number>(
    initialValues?.settlementPayoff || 0
  );
  const [otherFee, setOtherFee] = useState<number>(initialValues?.otherFee || 0);

  // Options State
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [paymentOffices, setPaymentOffices] = useState<PaymentOfficeOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Quick tenor options in months
  const tenorShortcuts = [12, 24, 36, 48, 60, 84, 120];

  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [prodRes, poRes] = await Promise.all([
          fetch("/api/v1/products?status=ACTIVE").catch(() => null),
          fetch("/api/v1/payment-offices?status=ACTIVE").catch(() => null),
        ]);

        if (prodRes && prodRes.ok) {
          const prodData = await prodRes.json();
          const activeProducts = prodData.data || [];
          setProducts(activeProducts);
          if (activeProducts.length > 0) {
            setProductId((prev) => prev || activeProducts[0].id);
          }
        }

        if (poRes && poRes.ok) {
          const poData = await poRes.json();
          setPaymentOffices(poData.data || []);
        }
      } catch (err) {
        console.error("[CalculatorForm] Error loading dropdowns:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  // Form Submission Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!birthDate) {
      errors.birthDate = "Tanggal lahir wajib diisi.";
    }

    if (!productId) {
      errors.productId = "Produk kredit wajib dipilih.";
    }

    if (!requestedPrincipal || requestedPrincipal <= 0) {
      errors.requestedPrincipal = "Plafon kredit harus lebih dari Rp 0.";
    }

    if (!tenorMonths || tenorMonths < 1) {
      errors.tenorMonths = "Tenor pinjaman minimal 1 bulan.";
    }

    if (netSalary === undefined || netSalary === null || netSalary < 0) {
      errors.netSalary = "Gaji bersih tidak boleh bernilai negatif.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    await onCalculate({
      customerName: customerName.trim() || undefined,
      customerNip: customerNip.trim() || undefined,
      birthDate,
      netSalary,
      otherIncome,
      otherDeductions,
      productId,
      paymentOfficeId: paymentOfficeId || undefined,
      requestedPrincipal,
      tenorMonths,
      calculationMethod,
      settlementPayoff,
      otherFee,
    });
  };

  const handleReset = () => {
    setCustomerName("");
    setCustomerNip("");
    setBirthDate("1975-01-01");
    setNetSalary(8500000);
    setOtherIncome(0);
    setOtherDeductions(0);
    if (products.length > 0) setProductId(products[0].id);
    setPaymentOfficeId("");
    setRequestedPrincipal(100000000);
    setTenorMonths(60);
    setCalculationMethod("FLAT");
    setSettlementPayoff(0);
    setOtherFee(0);
    setValidationErrors({});
  };

  // Helper formatting for Indonesian Rupiah
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(val);
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="calculator-form"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8",
        className
      )}
    >
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Calculator className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Form Parameter Kredit</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lengkapi data pemohon dan rincian pinjaman untuk menghitung kelayakan DBR dan angsuran.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          data-testid="calculator-reset-btn"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Form</span>
        </button>
      </div>

      <div className="mt-6 space-y-8">
        {/* SECTION 1: DATA PEMOHON */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
              1
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Data Pemohon & Finansial
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Nama Nasabah */}
            <div>
              <label
                htmlFor="customerName"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nama Lengkap Nasabah
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="customerName"
                  name="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* NIP / Identitas */}
            <div>
              <label
                htmlFor="customerNip"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                NIP / Nomor Identitas
              </label>
              <input
                id="customerNip"
                name="customerNip"
                type="text"
                value={customerNip}
                onChange={(e) => setCustomerNip(e.target.value)}
                placeholder="Contoh: 196101011985031001"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label
                htmlFor="birthDate"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tanggal Lahir <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={cn(
                    "block w-full rounded-lg border pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1",
                    validationErrors.birthDate
                      ? "border-red-300 focus:border-red-600 focus:ring-red-600"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                  )}
                />
              </div>
              {validationErrors.birthDate && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.birthDate}</p>
              )}
            </div>

            {/* Gaji Bersih */}
            <div>
              <label
                htmlFor="netSalary"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Gaji Bersih / Pensiun (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-semibold text-slate-500">Rp</span>
                </div>
                <input
                  id="netSalary"
                  name="netSalary"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={netSalary || ""}
                  onChange={(e) => setNetSalary(Number(e.target.value) || 0)}
                  placeholder="0"
                  className={cn(
                    "block w-full rounded-lg border pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1",
                    validationErrors.netSalary
                      ? "border-red-300 focus:border-red-600 focus:ring-red-600"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                  )}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Display: Rp {formatCurrency(netSalary)}
              </div>
            </div>

            {/* Penghasilan Lain */}
            <div>
              <label
                htmlFor="otherIncome"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Penghasilan Lain (Rp)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-semibold text-slate-500">Rp</span>
                </div>
                <input
                  id="otherIncome"
                  name="otherIncome"
                  type="number"
                  min="0"
                  step="1000"
                  value={otherIncome || ""}
                  onChange={(e) => setOtherIncome(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Display: Rp {formatCurrency(otherIncome)}
              </div>
            </div>

            {/* Potongan Lain */}
            <div>
              <label
                htmlFor="otherDeductions"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Potongan Pinjaman Luar (Rp)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-semibold text-slate-500">Rp</span>
                </div>
                <input
                  id="otherDeductions"
                  name="otherDeductions"
                  type="number"
                  min="0"
                  step="1000"
                  value={otherDeductions || ""}
                  onChange={(e) => setOtherDeductions(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Display: Rp {formatCurrency(otherDeductions)}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DATA KREDIT & PINJAMAN */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
              2
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Data Fasilitas & Pinjaman
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Produk Kredit Dropdown */}
            <div>
              <label
                htmlFor="productId"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Produk Kredit <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <select
                  id="productId"
                  name="productId"
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={isLoadingOptions}
                  className={cn(
                    "block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 bg-white",
                    validationErrors.productId
                      ? "border-red-300 focus:border-red-600 focus:ring-red-600"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                  )}
                >
                  <option value="" disabled>
                    {isLoadingOptions ? "Memuat produk..." : "-- Pilih Produk Kredit --"}
                  </option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.code})
                    </option>
                  ))}
                </select>
              </div>
              {validationErrors.productId && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.productId}</p>
              )}
            </div>

            {/* Kantor Bayar Dropdown */}
            <div>
              <label
                htmlFor="paymentOfficeId"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Kantor Bayar (Opsional)
              </label>
              <select
                id="paymentOfficeId"
                name="paymentOfficeId"
                value={paymentOfficeId}
                onChange={(e) => setPaymentOfficeId(e.target.value)}
                disabled={isLoadingOptions}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
              >
                <option value="">-- Tanpa Khusus / Kantor Pusat --</option>
                {paymentOffices.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.name} ({po.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Metode Perhitungan */}
            <div>
              <label
                id="calculation-method-label"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Metode Perhitungan <span className="text-red-500">*</span>
              </label>
              <div
                role="radiogroup"
                aria-labelledby="calculation-method-label"
                className="grid grid-cols-2 gap-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={calculationMethod === "FLAT"}
                  onClick={() => setCalculationMethod("FLAT")}
                  data-testid="method-flat-btn"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border p-2 text-xs font-semibold transition-all",
                    calculationMethod === "FLAT"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span>Flat Rate</span>
                  <span className="text-[10px] font-normal text-slate-500">Pokok Tetap</span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={calculationMethod === "ANNUITY"}
                  onClick={() => setCalculationMethod("ANNUITY")}
                  data-testid="method-annuity-btn"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border p-2 text-xs font-semibold transition-all",
                    calculationMethod === "ANNUITY"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span>Annuity (PMT)</span>
                  <span className="text-[10px] font-normal text-slate-500">Efektif Menurun</span>
                </button>
              </div>
            </div>

            {/* Plafon Kredit Dimohon */}
            <div>
              <label
                htmlFor="requestedPrincipal"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Plafon Dimohon (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-semibold text-slate-500">Rp</span>
                </div>
                <input
                  id="requestedPrincipal"
                  name="requestedPrincipal"
                  type="number"
                  min="1000000"
                  step="500000"
                  required
                  value={requestedPrincipal || ""}
                  onChange={(e) => setRequestedPrincipal(Number(e.target.value) || 0)}
                  placeholder="100000000"
                  className={cn(
                    "block w-full rounded-lg border pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1",
                    validationErrors.requestedPrincipal
                      ? "border-red-300 focus:border-red-600 focus:ring-red-600"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                  )}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                Plafon: Rp {formatCurrency(requestedPrincipal)}
              </div>
              {validationErrors.requestedPrincipal && (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors.requestedPrincipal}
                </p>
              )}
            </div>

            {/* Tenor dalam Bulan */}
            <div>
              <label
                htmlFor="tenorMonths"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tenor Pinjaman (Bulan) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <input
                  id="tenorMonths"
                  name="tenorMonths"
                  type="number"
                  min="1"
                  max="360"
                  required
                  value={tenorMonths || ""}
                  onChange={(e) => setTenorMonths(Number(e.target.value) || 0)}
                  placeholder="60"
                  className={cn(
                    "block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1",
                    validationErrors.tenorMonths
                      ? "border-red-300 focus:border-red-600 focus:ring-red-600"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                  )}
                />
              </div>
              {/* Quick Tenor Buttons */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tenorShortcuts.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTenorMonths(t)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors border",
                      tenorMonths === t
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    )}
                  >
                    {t} bln
                  </button>
                ))}
              </div>
            </div>

            {/* Pelunasan / Takeover */}
            <div>
              <label
                htmlFor="settlementPayoff"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Pelunasan Takeover (Rp)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-xs font-semibold text-slate-500">Rp</span>
                </div>
                <input
                  id="settlementPayoff"
                  name="settlementPayoff"
                  type="number"
                  min="0"
                  step="10000"
                  value={settlementPayoff || ""}
                  onChange={(e) => setSettlementPayoff(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Pelunasan: Rp {formatCurrency(settlementPayoff)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUBMIT ACTION BUTTON */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isLoading || isLoadingOptions}
          data-testid="calculate-submit-btn"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-150"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memproses Perhitungan...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Hitung Simulasi</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
