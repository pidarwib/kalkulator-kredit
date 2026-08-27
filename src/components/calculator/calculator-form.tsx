"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  User,
  Calendar,
  Layers,
  Building2,
  Clock,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyInput, NumberInput } from "@/components/ui";

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
  const [netSalary, setNetSalary] = useState<number>(initialValues?.netSalary ?? 8500000);
  const [otherIncome, setOtherIncome] = useState<number>(initialValues?.otherIncome ?? 0);
  const [otherDeductions, setOtherDeductions] = useState<number>(initialValues?.otherDeductions ?? 0);
  const [productId, setProductId] = useState(initialValues?.productId || "");
  const [paymentOfficeId, setPaymentOfficeId] = useState(initialValues?.paymentOfficeId || "");
  const [requestedPrincipal, setRequestedPrincipal] = useState<number>(
    initialValues?.requestedPrincipal ?? 100000000
  );
  const [tenorMonths, setTenorMonths] = useState<number>(initialValues?.tenorMonths ?? 60);
  const [calculationMethod, setCalculationMethod] = useState<"FLAT" | "ANNUITY">(
    initialValues?.calculationMethod || "FLAT"
  );
  const [settlementPayoff, setSettlementPayoff] = useState<number>(
    initialValues?.settlementPayoff ?? 0
  );
  const [otherFee, setOtherFee] = useState<number>(initialValues?.otherFee ?? 0);

  // Options State
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [paymentOffices, setPaymentOffices] = useState<PaymentOfficeOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

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

  // Compute live applicant age
  const applicantAgeInfo = useMemo(() => {
    if (!birthDate) return null;
    const bDate = new Date(birthDate);
    if (isNaN(bDate.getTime())) return null;

    const now = new Date();
    let years = now.getFullYear() - bDate.getFullYear();
    let months = now.getMonth() - bDate.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < bDate.getDate())) {
      years--;
      months += 12;
    }
    return { years, months, isValidDate: true };
  }, [birthDate]);

  // Comprehensive Field-level Validation Logic
  const runValidation = (field?: string): Record<string, string> => {
    const errors: Record<string, string> = { ...validationErrors };

    // 1. Birth Date & Age
    if (!field || field === "birthDate") {
      if (!birthDate || birthDate.trim() === "") {
        errors.birthDate = "Tanggal lahir wajib diisi.";
      } else {
        const bDate = new Date(birthDate);
        if (isNaN(bDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
          errors.birthDate = "Format tanggal lahir tidak valid (YYYY-MM-DD).";
        } else {
          const now = new Date();
          let years = now.getFullYear() - bDate.getFullYear();
          let months = now.getMonth() - bDate.getMonth();
          if (months < 0 || (months === 0 && now.getDate() < bDate.getDate())) {
            years--;
            months += 12;
          }

          if (years < 20) {
            errors.birthDate = `Usia pemohon (${years} thn) kurang dari batas minimum 20 tahun.`;
          } else if (years >= 85) {
            errors.birthDate = `Usia pemohon (${years} thn) melebihi batas usia maksimal sebelum 85 tahun.`;
          } else {
            delete errors.birthDate;
          }
        }
      }
    }

    // 2. Product ID
    if (!field || field === "productId") {
      if (!productId || productId.trim() === "") {
        errors.productId = "Produk kredit wajib dipilih.";
      } else {
        delete errors.productId;
      }
    }

    // 3. Requested Principal
    if (!field || field === "requestedPrincipal") {
      if (requestedPrincipal === undefined || requestedPrincipal === null || isNaN(requestedPrincipal)) {
        errors.requestedPrincipal = "Plafon kredit wajib diisi.";
      } else if (requestedPrincipal <= 0) {
        errors.requestedPrincipal = "Plafon kredit harus lebih besar dari Rp 0.";
      } else if (requestedPrincipal < 1000000) {
        errors.requestedPrincipal = "Plafon kredit minimal pengajuan adalah Rp 1.000.000.";
      } else if (requestedPrincipal > 1000000000) {
        errors.requestedPrincipal = "Plafon kredit melebihi batas sistem maksimal Rp 1.000.000.000.";
      } else {
        delete errors.requestedPrincipal;
      }
    }

    // 4. Tenor Months
    if (!field || field === "tenorMonths") {
      if (tenorMonths === undefined || tenorMonths === null || isNaN(tenorMonths)) {
        errors.tenorMonths = "Tenor pinjaman wajib diisi.";
      } else if (tenorMonths < 1) {
        errors.tenorMonths = "Tenor pinjaman minimal 1 bulan.";
      } else if (tenorMonths > 360) {
        errors.tenorMonths = "Tenor pinjaman maksimal 360 bulan (30 tahun).";
      } else {
        delete errors.tenorMonths;
      }
    }

    // 5. Net Salary
    if (!field || field === "netSalary") {
      if (netSalary === undefined || netSalary === null || isNaN(netSalary)) {
        errors.netSalary = "Gaji bersih wajib diisi.";
      } else if (netSalary <= 0) {
        errors.netSalary = "Gaji bersih harus lebih besar dari Rp 0.";
      } else {
        delete errors.netSalary;
      }
    }

    // 6. Other Income
    if (!field || field === "otherIncome") {
      if (otherIncome < 0) {
        errors.otherIncome = "Penghasilan lain tidak boleh bernilai negatif.";
      } else {
        delete errors.otherIncome;
      }
    }

    // 7. Other Deductions
    if (!field || field === "otherDeductions") {
      if (otherDeductions < 0) {
        errors.otherDeductions = "Potongan pinjaman luar tidak boleh bernilai negatif.";
      } else {
        delete errors.otherDeductions;
      }
    }

    // 8. Settlement Payoff
    if (!field || field === "settlementPayoff") {
      if (settlementPayoff < 0) {
        errors.settlementPayoff = "Nilai pelunasan takeover tidak boleh bernilai negatif.";
      } else {
        delete errors.settlementPayoff;
      }
    }

    // 9. NIP Format (optional)
    if (!field || field === "customerNip") {
      if (customerNip && !/^[A-Za-z0-9\s-]+$/.test(customerNip)) {
        errors.customerNip = "NIP hanya boleh mengandung huruf, angka, spasi, atau tanda hubung.";
      } else {
        delete errors.customerNip;
      }
    }

    setValidationErrors(errors);
    return errors;
  };

  const markTouched = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
    runValidation(fieldName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {
      birthDate: true,
      productId: true,
      requestedPrincipal: true,
      tenorMonths: true,
      netSalary: true,
      otherIncome: true,
      otherDeductions: true,
      settlementPayoff: true,
      customerNip: true,
    };
    setTouchedFields(allTouched);

    const errors = runValidation();
    if (Object.keys(errors).length > 0) return;

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
    setTouchedFields({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
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
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 transition-colors"
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
                onChange={(e) => {
                  setCustomerNip(e.target.value);
                  if (touchedFields.customerNip) runValidation("customerNip");
                }}
                onBlur={() => markTouched("customerNip")}
                placeholder="Contoh: 196101011985031001"
                className={cn(
                  "block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1",
                  validationErrors.customerNip
                    ? "border-red-300 focus:border-red-600 focus:ring-red-600 bg-red-50/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                )}
              />
              {validationErrors.customerNip && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationErrors.customerNip}</span>
                </p>
              )}
            </div>

            {/* Tanggal Lahir */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="birthDate"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Tanggal Lahir <span className="text-red-500">*</span>
                </label>
                {applicantAgeInfo && applicantAgeInfo.isValidDate && (
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Usia: {applicantAgeInfo.years} thn {applicantAgeInfo.months} bln
                  </span>
                )}
              </div>
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
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    if (touchedFields.birthDate) runValidation("birthDate");
                  }}
                  onBlur={() => markTouched("birthDate")}
                  className={cn(
                    "block w-full rounded-lg border pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1",
                    validationErrors.birthDate
                      ? "border-red-300 focus:border-red-600 focus:ring-red-600 bg-red-50/20 text-red-900"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                  )}
                />
              </div>
              {validationErrors.birthDate ? (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationErrors.birthDate}</span>
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Digunakan untuk perhitungan batas usia dan premi asuransi jiwa.
                </p>
              )}
            </div>

            {/* Gaji Bersih */}
            <div>
              <CurrencyInput
                id="netSalary"
                name="netSalary"
                label="Gaji Bersih / Pensiun (Rp)"
                required
                value={netSalary}
                onChange={(val) => {
                  setNetSalary(val);
                  if (touchedFields.netSalary) runValidation("netSalary");
                }}
                onBlur={() => markTouched("netSalary")}
                error={validationErrors.netSalary}
                placeholder="8.500.000"
                helperText="Total penghasilan bersih bulanan yang sah."
              />
            </div>

            {/* Penghasilan Lain */}
            <div>
              <CurrencyInput
                id="otherIncome"
                name="otherIncome"
                label="Penghasilan Lain (Rp)"
                value={otherIncome}
                onChange={(val) => {
                  setOtherIncome(val);
                  if (touchedFields.otherIncome) runValidation("otherIncome");
                }}
                onBlur={() => markTouched("otherIncome")}
                error={validationErrors.otherIncome}
                placeholder="0"
                helperText="Pendapatan tambahan rutin (opsional)."
              />
            </div>

            {/* Potongan Lain */}
            <div>
              <CurrencyInput
                id="otherDeductions"
                name="otherDeductions"
                label="Potongan Pinjaman Luar (Rp)"
                value={otherDeductions}
                onChange={(val) => {
                  setOtherDeductions(val);
                  if (touchedFields.otherDeductions) runValidation("otherDeductions");
                }}
                onBlur={() => markTouched("otherDeductions")}
                error={validationErrors.otherDeductions}
                placeholder="0"
                helperText="Kewajiban angsuran di bank/koperasi lain."
              />
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
                  onChange={(e) => {
                    setProductId(e.target.value);
                    if (touchedFields.productId) runValidation("productId");
                  }}
                  onBlur={() => markTouched("productId")}
                  disabled={isLoadingOptions}
                  className={cn(
                    "block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 bg-white",
                    validationErrors.productId
                      ? "border-red-300 focus:border-red-600 focus:ring-red-600 bg-red-50/20"
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
              {validationErrors.productId ? (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationErrors.productId}</span>
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Memuat suku bunga, provisi, admin, dan matriks asuransi.
                </p>
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
              <p className="mt-1 text-[11px] text-slate-500">
                Pilih jika terdapat biaya flagging / verifikasi khusus.
              </p>
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
              <CurrencyInput
                id="requestedPrincipal"
                name="requestedPrincipal"
                label="Plafon Dimohon (Rp)"
                required
                value={requestedPrincipal}
                onChange={(val) => {
                  setRequestedPrincipal(val);
                  if (touchedFields.requestedPrincipal) runValidation("requestedPrincipal");
                }}
                onBlur={() => markTouched("requestedPrincipal")}
                error={validationErrors.requestedPrincipal}
                placeholder="100.000.000"
                helperText="Besaran pokok pinjaman yang diajukan debitur."
              />
            </div>

            {/* Tenor dalam Bulan */}
            <div>
              <label
                htmlFor="tenorMonths"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tenor Pinjaman (Bulan) <span className="text-red-500">*</span>
              </label>
              <NumberInput
                id="tenorMonths"
                name="tenorMonths"
                required
                min={1}
                max={360}
                value={tenorMonths}
                onChange={(val) => {
                  setTenorMonths(val);
                  if (touchedFields.tenorMonths) runValidation("tenorMonths");
                }}
                onBlur={() => markTouched("tenorMonths")}
                suffix="Bulan"
                error={validationErrors.tenorMonths}
                placeholder="60"
              />
              {/* Quick Tenor Buttons */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tenorShortcuts.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTenorMonths(t);
                      if (touchedFields.tenorMonths) runValidation("tenorMonths");
                    }}
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
              <CurrencyInput
                id="settlementPayoff"
                name="settlementPayoff"
                label="Pelunasan Takeover (Rp)"
                value={settlementPayoff}
                onChange={(val) => {
                  setSettlementPayoff(val);
                  if (touchedFields.settlementPayoff) runValidation("settlementPayoff");
                }}
                onBlur={() => markTouched("settlementPayoff")}
                error={validationErrors.settlementPayoff}
                placeholder="0"
                helperText="Estimasi kewajiban pelunasan fasilitas sebelumnya."
              />
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
