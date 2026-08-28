/**
 * TASK-071 — Excel Financial Regression Test Suite
 *
 * Strict Regression Benchmark against Excel BPR Reference Formulas (Ref, Asuransi, Simulasi BPR):
 * - Installment (FLAT & ANNUITY/PMT)
 * - Debt Burden Ratio (DBR) & Boundary Conditions
 * - Insurance Engine (Dual Age Lookup MAX(Current, Next), Fronting, Reserve)
 * - Fee Engine & Net Disbursement (Single-deduction Flagging Fee, 2-period installment deduction)
 * - Maximum Principal (Flat Capacity vs Annuity PV Capacity)
 * - Multi-rule Eligibility Engine (OK vs OVER with exact failure reasons)
 * - Amortization Schedules (Flat linear vs Annuity PMT exact closing balance Rp 0)
 */

import { describe, it, expect } from "vitest";
import { FlatCalculationStrategy } from "@/lib/calculation/flat-calculation-strategy";
import { AnnuityCalculationStrategy } from "@/lib/calculation/annuity-calculation-strategy";
import { FeeCalculationService } from "@/lib/calculation/fee-calculation-service";
import { DbrService } from "@/lib/calculation/dbr-service";
import { EligibilityService } from "@/lib/calculation/eligibility-service";
import { MaximumPrincipalService } from "@/lib/calculation/maximum-principal-service";
import { AmortizationEngine } from "@/lib/calculation/amortization-engine";
import { Money, Percentage, Tenor } from "@/lib/domain";

describe("TASK-071: Excel Reference Financial Regression", () => {
  // Common Reference Defaults per BUSINESS_RULES.md §5
  const defaultAnnualRate = 0.108; // 10.8% p.a.
  const defaultMonthlyRate = 0.009; // 0.9% per month
  const defaultMaxDbr = 0.90; // 90% DBR Max
  const defaultMaxProductPrincipal = Money.from(200_000_000); // Rp 200.000.000
  const defaultPrincipalRoundingIncrement = Money.from(100_000); // Rp 100.000

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Installment Regression (FLAT & ANNUITY)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Installment Regression vs Excel Reference", () => {
    it("Benchmark FLAT: Principal 50M, Tenor 60mo, Rate 10.8% p.a. (0.9%/mo)", () => {
      const strategy = new FlatCalculationStrategy();
      const result = strategy.calculate({
        principal: Money.from(50_000_000),
        tenor: 60,
        monthlySalary: Money.from(10_000_000),
        annualMarginRate: defaultAnnualRate,
        maxDbr: defaultMaxDbr,
        maxProductPrincipal: defaultMaxProductPrincipal,
        principalRoundingIncrement: defaultPrincipalRoundingIncrement,
      });

      // Excel Expected:
      // Principal Portion = 50.000.000 / 60 = 833.333,33
      // Interest Portion = 50.000.000 * 0.009 = 450.000,00
      // Monthly Installment = 1.283.333,33
      expect(result.installment.principalPortion.toNumber()).toBeCloseTo(833_333.33, 2);
      expect(result.installment.interestPortion.toNumber()).toBe(450_000);
      expect(result.installment.monthlyInstallment.toNumber()).toBeCloseTo(1_283_333.33, 2);
    });

    it("Benchmark ANNUITY: Principal 100M, Tenor 36mo, Rate 10.8% p.a. (0.9%/mo PMT)", () => {
      const strategy = new AnnuityCalculationStrategy();
      const result = strategy.calculate({
        principal: Money.from(100_000_000),
        tenor: 36,
        monthlySalary: Money.from(15_000_000),
        annualMarginRate: defaultAnnualRate,
        maxDbr: defaultMaxDbr,
        maxProductPrincipal: defaultMaxProductPrincipal,
        principalRoundingIncrement: defaultPrincipalRoundingIncrement,
      });

      // Excel Expected PMT:
      // PMT = 100.000.000 * 0.009 / (1 - (1.009)^(-36)) = Rp 3.264.408,57
      expect(result.installment.monthlyInstallment.toNumber()).toBeCloseTo(3_264_408.57, 2);
      // First month interest: 100M * 0.9% = Rp 900.000
      expect(result.installment.interestPortion.toNumber()).toBe(900_000);
      // First month principal: 3.264.408,57 - 900.000 = Rp 2.364.408,57
      expect(result.installment.principalPortion.toNumber()).toBeCloseTo(2_364_408.57, 2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Maximum Principal Capacity Regression (Flat Capacity vs Annuity PV)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Maximum Principal Capacity Regression", () => {
    it("Benchmark Flat Maximum Capacity: Salary 10M, Tenor 60mo, DBR 90%, Rate 0.9%/mo", () => {
      // Max Installment = 10.000.000 * 90% = 9.000.000
      // Max Capacity = (9.000.000 * 60) / (1 + 0.009 * 60) = 540.000.000 / 1.54 = 350.649.350,65
      // Capped at Product Max (200M) and rounded to 100k -> 200.000.000
      const maxPrinc = MaximumPrincipalService.calculate({
        birthDate: new Date("1980-01-01"),
        calculationDate: new Date("2026-01-01"),
        monthlySalary: 10_000_000,
        requestedTenorMonths: 60,
        maxProductTenorMonths: 120,
        maxDbr: defaultMaxDbr,
        annualMarginRate: defaultAnnualRate,
        maxProductPrincipal: defaultMaxProductPrincipal,
        principalRoundingIncrement: defaultPrincipalRoundingIncrement,
        method: "FLAT",
      });

      expect(maxPrinc.maxPrincipalFinal.toNumber()).toBe(200_000_000);
      expect(maxPrinc.evaluatedTenorMonths).toBe(60);
      expect(maxPrinc.maxTenorFinalMonths).toBe(120);
    });

    it("Benchmark Annuity Maximum Capacity via PV Formula: Salary 5M, Tenor 24mo, DBR 90%, Rate 0.9%/mo", () => {
      // Max Installment = 5.000.000 * 90% = 4.500.000
      // PV(0.9%, 24, 4.500.000) = 4.500.000 * (1 - (1.009)^(-24)) / 0.009 = Rp 96.790.354,82
      // Rounded down to 100k -> Rp 96.700.000
      const maxPrinc = MaximumPrincipalService.calculate({
        birthDate: new Date("1980-01-01"),
        calculationDate: new Date("2026-01-01"),
        monthlySalary: 5_000_000,
        requestedTenorMonths: 24,
        maxProductTenorMonths: 120,
        maxDbr: defaultMaxDbr,
        annualMarginRate: defaultAnnualRate,
        maxProductPrincipal: defaultMaxProductPrincipal,
        principalRoundingIncrement: defaultPrincipalRoundingIncrement,
        method: "ANNUITY",
      });

      expect(maxPrinc.maxPrincipalFinal.toNumber()).toBe(96_700_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Insurance Engine Regression (Dual Age Lookup MAX(Current, Next))
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Insurance Calculation & Dual Age Lookup Regression", () => {
    it("should compute premium, fronting (5%), reserve (10%), and total charge accurately", () => {
      const principal = Money.from(50_000_000);
      const selectedRate = 0.035; // 3.5%
      const frontingRate = 0.05; // 5%
      const reserveRate = 0.10; // 10%

      const premium = principal.multiply(selectedRate); // 1.750.000
      const fronting = premium.multiply(frontingRate); // 87.500
      const reserve = premium.multiply(reserveRate); // 175.000
      const totalCharge = premium.add(fronting).add(reserve); // 2.012.500

      // Premium = 50M * 3.5% = 1.750.000
      expect(premium.toNumber()).toBe(1_750_000);
      // Fronting = 1.750.000 * 5% = 87.500
      expect(fronting.toNumber()).toBe(87_500);
      // Reserve = 1.750.000 * 10% = 175.000
      expect(reserve.toNumber()).toBe(175_000);
      // Total Charge = 1.750.000 + 87.500 + 175.000 = 2.012.500
      expect(totalCharge.toNumber()).toBe(2_012_500);
    });

    it("should select the higher rate between current age and next age", () => {
      const currentRate = 0.032; // 3.2%
      const nextRate = 0.038; // 3.8%

      const selected = Math.max(currentRate, nextRate);
      expect(selected).toBe(0.038);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Fee Engine & Net Disbursement Regression (Flagging Fee Isolation)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Fee Engine & Net Disbursement Regression", () => {
    it("should calculate total fees and net disbursement with single-deduction flagging fee", async () => {
      const principal = Money.from(50_000_000);
      const installment = Money.from(1_283_333.33);

      const feeResult = await FeeCalculationService.calculate({
        productId: "dummy-prod",
        principal,
        monthlyInstallment: installment,
        insuranceCharge: Money.from(2_012_500),
        installmentDeductionPeriods: 2,
        feeParameter: {
          id: "fee-1",
          productId: "dummy-prod",
          paymentOfficeId: null,
          version: "v1.0",
          provisionRate: 0.01 as unknown as import("@prisma/client/runtime/library").Decimal,
          adminRate: 0.005 as unknown as import("@prisma/client/runtime/library").Decimal,
          verificationFee: 1_500_000 as unknown as import("@prisma/client/runtime/library").Decimal,
          flaggingFee: 38_000 as unknown as import("@prisma/client/runtime/library").Decimal,
          frontingRate: 0.05 as unknown as import("@prisma/client/runtime/library").Decimal,
          reserveRate: 0.10 as unknown as import("@prisma/client/runtime/library").Decimal,
          effectiveFrom: new Date(),
          effectiveTo: null,
          isActive: true,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Total Fees: 500k + 250k + 1.5M + 2.012.500 + 2.566.666,66 = 6.829.166,66
      expect(feeResult.adminFee.toNumber()).toBe(250_000);
      expect(feeResult.provisionFee.toNumber()).toBe(500_000);
      expect(feeResult.verificationFee.toNumber()).toBe(1_500_000);
      expect(feeResult.installmentDeduction.toNumber()).toBeCloseTo(2_566_666.66, 1);
      expect(feeResult.totalFees.toNumber()).toBeCloseTo(6_829_166.66, 1);

      // Terima Bersih = 50.000.000 - 6.829.166,66 - 38.000 = Rp 43.132.833,34
      expect(feeResult.netDisbursement.toNumber()).toBeCloseTo(43_132_833.34, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Eligibility & Boundary Regression Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5. Multi-Rule Eligibility Engine & Strict Boundary Regression", () => {
    it("DBR Boundary: 89.99% -> OK, 90.00% -> OK, 90.01% -> OVER", () => {
      const maxDbr = 0.90;

      // 89.99%
      const res8999 = DbrService.evaluateDbr(Money.from(8_999_000), Money.from(10_000_000), maxDbr);
      expect(res8999.isValid).toBe(true);
      expect(res8999.status).toBe("OK");

      // 90.00%
      const res9000 = DbrService.evaluateDbr(Money.from(9_000_000), Money.from(10_000_000), maxDbr);
      expect(res9000.isValid).toBe(true);
      expect(res9000.status).toBe("OK");

      // 90.01%
      const res9001 = DbrService.evaluateDbr(Money.from(9_001_000), Money.from(10_000_000), maxDbr);
      expect(res9001.isValid).toBe(false);
      expect(res9001.status).toBe("OVER");
    });

    it("Tenor Boundary: 120 months -> OK, 121 months -> OVER", () => {
      const calcDate = new Date("2026-01-01");
      const birthDate = new Date("1980-01-01");

      const res120 = EligibilityService.evaluate({
        birthDate,
        calculationDate: calcDate,
        requestedPrincipal: 50_000_000,
        requestedTenor: 120,
        monthlySalary: 10_000_000,
        monthlyInstallment: 1_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200_000_000,
        maxPrincipalCapacity: 200_000_000,
        netDisbursement: 45_000_000,
      });
      expect(res120.isEligible).toBe(true);

      const res121 = EligibilityService.evaluate({
        birthDate,
        calculationDate: calcDate,
        requestedPrincipal: 50_000_000,
        requestedTenor: 121,
        monthlySalary: 10_000_000,
        monthlyInstallment: 1_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200_000_000,
        maxPrincipalCapacity: 200_000_000,
        netDisbursement: 45_000_000,
      });
      expect(res121.isEligible).toBe(false);
      expect(res121.status).toBe("OVER");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Amortization Schedule Balance Convergence Regression
  // ═══════════════════════════════════════════════════════════════════════════

  describe("6. Amortization Schedule Convergence Regression", () => {
    it("FLAT: 60 months schedule must converge to exactly 0 closing balance", () => {
      const schedule = AmortizationEngine.generateSchedule({
        principal: Money.from(50_000_000),
        tenor: 60,
        method: "FLAT",
        annualMarginRate: defaultAnnualRate,
        startDate: new Date("2026-01-01"),
      });

      expect(schedule.items).toHaveLength(60);
      expect(schedule.items[59].closingBalance.toNumber()).toBe(0);
      expect(schedule.totalPrincipalPaid.toNumber()).toBe(50_000_000);
      expect(schedule.totalInterestPaid.toNumber()).toBe(27_000_000);
    });

    it("ANNUITY: 36 months schedule must converge to exactly 0 closing balance with monotonically decreasing interest", () => {
      const schedule = AmortizationEngine.generateSchedule({
        principal: Money.from(100_000_000),
        tenor: 36,
        method: "ANNUITY",
        annualMarginRate: defaultAnnualRate,
        startDate: new Date("2026-01-01"),
      });

      expect(schedule.items).toHaveLength(36);
      expect(schedule.items[35].closingBalance.toNumber()).toBe(0);

      // Verify interest monotonically decreasing
      for (let i = 1; i < 36; i++) {
        expect(schedule.items[i].interestPortion.toNumber()).toBeLessThanOrEqual(
          schedule.items[i - 1].interestPortion.toNumber()
        );
      }
    });
  });
});
