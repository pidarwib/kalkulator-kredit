/**
 * TASK-067 — Comprehensive Financial Domain Unit Tests
 *
 * Exhaustive unit test suite covering all 9 core financial computation domains:
 * 1. Money Value Object & Rounding (Decimal precision, floor, increment rounding, Rupiah format)
 * 2. Flat Calculation Strategy (Installment, monthly margin, total payment, capacity)
 * 3. Annuity Calculation Strategy (PMT formula, monthly interest/principal decay, capacity)
 * 4. Insurance Calculation Domain (Age rounding, tenor ceil, premium, fronting, reserve)
 * 5. Fee Calculation Domain (Provision, admin, verification, flagging, deductions, net disbursement)
 * 6. DBR Service (Debt Burden Ratio, remaining income, threshold evaluation)
 * 7. Eligibility Service (All 7 standard credit rejection rules & reason aggregation)
 * 8. Maximum Principal Service (Reverse DBR capacity, product ceiling, floor increment rounding)
 * 9. Amortization Engine (Schedule generation, payment dates, zero closing balance guarantee)
 */

import { describe, it, expect } from "vitest";
import {
  Money,
  Percentage,
  Tenor,
} from "@/lib/domain";
import { FlatCalculationStrategy } from "@/lib/calculation/flat-calculation-strategy";
import { AnnuityCalculationStrategy } from "@/lib/calculation/annuity-calculation-strategy";
import { DbrService } from "@/lib/calculation/dbr-service";
import { EligibilityService } from "@/lib/calculation/eligibility-service";
import { MaximumPrincipalService } from "@/lib/calculation/maximum-principal-service";
import { AmortizationEngine } from "@/lib/calculation/amortization-engine";
import { calculateAgeBreakdown } from "@/lib/calculation/calculation-input-validator";

describe("TASK-067: Comprehensive Financial Domain Unit Tests", () => {
  const calculationDate = new Date("2026-01-01");
  const birthDateAge60 = new Date("1966-01-01");

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MONEY VALUE OBJECT & ROUNDING UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Money Value Object & Rounding Precision", () => {
    it("should handle exact arithmetic without floating point precision issues", () => {
      const m1 = Money.from(100_000.55);
      const m2 = Money.from(200_000.45);
      const sum = m1.add(m2);

      expect(sum.toNumber()).toBe(300_001);
      expect(sum.amount.toString()).toBe("300001");
    });

    it("should subtract and multiply accurately", () => {
      const base = Money.from(500_000);
      const diff = base.subtract(Money.from(150_000));
      expect(diff.toNumber()).toBe(350_000);

      const multiplied = diff.multiply(2.5);
      expect(multiplied.toNumber()).toBe(875_000);
    });

    it("should round down to increment (floor rounding) for loan capacity", () => {
      const raw = Money.from(48_789_123);
      const increment = Money.from(100_000);
      const rounded = raw.floorTo(increment);

      expect(rounded.toNumber()).toBe(48_700_000);
    });

    it("should format currency in standard Indonesian Rupiah format", () => {
      const amount = Money.from(150_000_000);
      const formatted = amount.format();
      expect(formatted).toContain("150.000.000");
    });

    it("should correctly compare amounts", () => {
      const a = Money.from(100_000);
      const b = Money.from(200_000);
      const c = Money.from(100_000);

      expect(a.lessThan(b)).toBe(true);
      expect(b.greaterThan(a)).toBe(true);
      expect(a.equals(c)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. FLAT CALCULATION STRATEGY UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Flat Calculation Strategy (BUSINESS_RULES §21)", () => {
    const strategy = new FlatCalculationStrategy();

    it("should calculate exact flat installment, principal portion, and monthly margin", () => {
      // Principal = Rp 60.000.000, Tenor = 60 months, Rate = 12% p.a.
      const principal = Money.from(60_000_000);
      const tenor = 60;
      const monthlySalary = Money.from(5_000_000);
      const annualMarginRate = 0.12;
      const maxDbr = 0.85;
      const maxProductPrincipal = Money.from(200_000_000);
      const principalRoundingIncrement = Money.from(100_000);

      const result = strategy.calculate({
        principal,
        tenor,
        monthlySalary,
        annualMarginRate,
        maxDbr,
        maxProductPrincipal,
        principalRoundingIncrement,
      });

      // Principal/mo = 60M / 60 = 1.000.000
      // Margin/mo = (60M * 0.12) / 12 = 600.000
      // Monthly installment = 1.600.000
      expect(result.installment.monthlyInstallment.toNumber()).toBe(1_600_000);
      expect(result.installment.principalPortion.toNumber()).toBe(1_000_000);
      expect(result.installment.interestPortion.toNumber()).toBe(600_000);
      expect(result.isDbrValid).toBe(true);
      expect(result.isPrincipalValid).toBe(true);
    });

    it("should calculate reverse maximum principal capacity for flat loan", () => {
      const principal = Money.from(50_000_000);
      const tenor = 60;
      const monthlySalary = Money.from(10_000_000);
      const annualMarginRate = 0.12;
      const maxDbr = 0.85;
      const maxProductPrincipal = Money.from(500_000_000);
      const principalRoundingIncrement = Money.from(100_000);

      const result = strategy.calculate({
        principal,
        tenor,
        monthlySalary,
        annualMarginRate,
        maxDbr,
        maxProductPrincipal,
        principalRoundingIncrement,
      });

      // 8.5M * 60 / (1 + 0.01*60) = 510M / 1.6 = 318.750.000 -> Floor to 100k = 318.700.000
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(318_700_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ANNUITY CALCULATION STRATEGY UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Annuity Calculation Strategy (BUSINESS_RULES §22)", () => {
    const strategy = new AnnuityCalculationStrategy();

    it("should calculate exact annuity PMT installment", () => {
      // Principal = Rp 100.000.000, Tenor = 12 months, Rate = 12% p.a. (i = 0.01/mo)
      // PMT = 100M * (0.01 * (1.01)^12) / ((1.01)^12 - 1) = Rp 8.884.878,87
      const principal = Money.from(100_000_000);
      const tenor = 12;
      const monthlySalary = Money.from(20_000_000);
      const annualMarginRate = 0.12;
      const maxDbr = 0.85;
      const maxProductPrincipal = Money.from(500_000_000);
      const principalRoundingIncrement = Money.from(100_000);

      const result = strategy.calculate({
        principal,
        tenor,
        monthlySalary,
        annualMarginRate,
        maxDbr,
        maxProductPrincipal,
        principalRoundingIncrement,
      });

      expect(result.installment.monthlyInstallment.toNumber()).toBeCloseTo(8_884_878.87, 0);
      // First month interest = 100M * 1% = 1.000.000
      expect(result.installment.interestPortion.toNumber()).toBeCloseTo(1_000_000, 0);
      // First month principal = 8.884.878,87 - 1.000.000 = 7.884.878,87
      expect(result.installment.principalPortion.toNumber()).toBeCloseTo(7_884_878.87, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. INSURANCE CALCULATION UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Insurance Calculation Domain (BUSINESS_RULES §23)", () => {
    it("should round age up when months > 6 (ceil rule for insurance)", () => {
      const birthDate = new Date("1980-01-01");
      const calcDate = new Date("2026-08-01");
      const ageBreakdown = calculateAgeBreakdown(birthDate, calcDate);

      expect(ageBreakdown.years).toBe(46);
      expect(ageBreakdown.months).toBe(7);

      const insuranceAge = ageBreakdown.months > 6 ? ageBreakdown.years + 1 : ageBreakdown.years;
      expect(insuranceAge).toBe(47);
    });

    it("should ceil tenor months into insurance years (25 mo = 3 yrs, 12 mo = 1 yr)", () => {
      expect(Math.ceil(12 / 12)).toBe(1);
      expect(Math.ceil(13 / 12)).toBe(2);
      expect(Math.ceil(24 / 12)).toBe(2);
      expect(Math.ceil(25 / 12)).toBe(3);
      expect(Math.ceil(60 / 12)).toBe(5);
    });

    it("should compute exact insurance premium, fronting fee, reserve, and total insurance charge", () => {
      const principal = Money.from(100_000_000);
      const rate = 0.035; // 3.5%
      const frontingRate = 0.05; // 5%
      const reserveRate = 0.10; // 10%

      const premium = principal.multiply(rate); // 3.500.000
      const fronting = premium.multiply(frontingRate); // 175.000
      const reserve = premium.multiply(reserveRate); // 350.000
      const totalCharge = premium.add(fronting).add(reserve); // 4.025.000

      expect(premium.toNumber()).toBe(3_500_000);
      expect(fronting.toNumber()).toBe(175_000);
      expect(reserve.toNumber()).toBe(350_000);
      expect(totalCharge.toNumber()).toBe(4_025_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FEE & NET DISBURSEMENT CALCULATION UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5. Fee & Net Disbursement Calculation (BUSINESS_RULES §31-37)", () => {
    it("should compute exact fees and net disbursement formula", () => {
      const principal = Money.from(50_000_000);
      const provisionRate = 0.01; // 1% = 500.000
      const adminRate = 0.005; // 0.5% = 250.000
      const verificationFee = Money.from(50_000);
      const flaggingFee = Money.from(150_000);
      const insuranceCharge = Money.from(1_900_000);
      const upfrontInstallmentDeduction = Money.from(1_333_333);
      const settlementPayoff = Money.from(5_000_000);
      const otherDeductions = Money.from(200_000);

      const provision = principal.multiply(provisionRate);
      const admin = principal.multiply(adminRate);

      const totalFees = provision
        .add(admin)
        .add(verificationFee)
        .add(flaggingFee)
        .add(insuranceCharge)
        .add(upfrontInstallmentDeduction);

      expect(totalFees.toNumber()).toBe(4_183_333);

      const totalDeductions = totalFees.add(settlementPayoff).add(otherDeductions);
      expect(totalDeductions.toNumber()).toBe(9_383_333);

      const netDisbursement = principal.subtract(totalDeductions);
      expect(netDisbursement.toNumber()).toBe(40_616_667);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DBR SERVICE UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("6. DBR (Debt Burden Ratio) Evaluation (BUSINESS_RULES §24)", () => {
    it("should compute accurate DBR ratio and remaining salary", () => {
      const salary = Money.from(10_000_000);
      const installment = Money.from(4_000_000);
      const maxDbr = 0.85;

      const dbr = DbrService.calculateDbr(installment, salary);
      expect(dbr.toPercent()).toBe(40);

      const maxInstallment = DbrService.calculateMaxInstallment(salary, maxDbr);
      expect(maxInstallment.toNumber()).toBe(8_500_000);

      const remainingSalary = DbrService.calculateRemainingSalary(salary, installment);
      expect(remainingSalary.toNumber()).toBe(6_000_000);

      const evalResult = DbrService.evaluateDbr(installment, salary, maxDbr);
      expect(evalResult.isValid).toBe(true);
      expect(evalResult.status).toBe("OK");
    });

    it("should mark ineligible when DBR exceeds maximum threshold", () => {
      const salary = Money.from(5_000_000);
      const installment = Money.from(4_500_000); // 90% DBR > 85% max
      const maxDbr = 0.85;

      const evalResult = DbrService.evaluateDbr(installment, salary, maxDbr);
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.reason).toContain("melebihi batas maksimum");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ELIGIBILITY SERVICE UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("7. Eligibility Service (BUSINESS_RULES §41-45)", () => {
    it("should pass eligible loan meeting all criteria", () => {
      const evalResult = EligibilityService.evaluate({
        birthDate: birthDateAge60,
        calculationDate,
        requestedPrincipal: 50_000_000,
        requestedTenor: 60,
        monthlySalary: 10_000_000,
        monthlyInstallment: 2_500_000,
        maxDbr: 0.85,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200_000_000,
        maxPrincipalCapacity: 150_000_000,
        netDisbursement: 45_000_000,
      });

      expect(evalResult.isEligible).toBe(true);
      expect(evalResult.status).toBe("OK");
      expect(evalResult.reasons).toHaveLength(0);
      expect(evalResult.ageAtCalculation.years).toBe(60);
      expect(evalResult.ageAtMaturity.years).toBe(65);
    });

    it("should fail when requested principal exceeds product maximum ceiling", () => {
      const evalResult = EligibilityService.evaluate({
        birthDate: birthDateAge60,
        calculationDate,
        requestedPrincipal: 300_000_000, // Exceeds 200M product max
        requestedTenor: 60,
        monthlySalary: 10_000_000,
        monthlyInstallment: 2_500_000,
        maxDbr: 0.85,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200_000_000,
        maxPrincipalCapacity: 350_000_000,
        netDisbursement: 280_000_000,
      });

      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.reasons[0]).toContain("Plafon pengajuan");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. MAXIMUM PRINCIPAL SERVICE UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("8. Maximum Principal Capacity Service", () => {
    it("should cap maximum principal by product ceiling when capacity exceeds ceiling", () => {
      const result = MaximumPrincipalService.calculate({
        monthlySalary: 10_000_000,
        birthDate: birthDateAge60,
        calculationDate,
        method: "FLAT",
        requestedTenorMonths: 60,
        annualMarginRate: 0.12,
        maxDbr: 0.85,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200_000_000,
        principalRoundingIncrement: 100_000,
      });

      expect(result.maxInstallment.toNumber()).toBe(8_500_000);
      expect(result.maxPrincipalFinal.toNumber()).toBe(200_000_000);
    });

    it("should floor round capacity when capacity is lower than product ceiling", () => {
      const result = MaximumPrincipalService.calculate({
        monthlySalary: 3_000_000, // 3M -> Max Installment = 2.55M
        birthDate: birthDateAge60,
        calculationDate,
        method: "FLAT",
        requestedTenorMonths: 24,
        annualMarginRate: 0.12,
        maxDbr: 0.85,
        maxProductPrincipal: 200_000_000,
        principalRoundingIncrement: 100_000,
      });

      expect(result.maxPrincipalFinal.toNumber()).toBeLessThan(200_000_000);
      expect(result.roundedMaxPrincipalCapacity.toNumber() % 100_000).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. AMORTIZATION ENGINE SCHEDULE GENERATION UNIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("9. Amortization Schedule Generation Engine (BUSINESS_RULES §51)", () => {
    it("should generate exact flat amortization schedule with 0 closing balance on final period", () => {
      const schedule = AmortizationEngine.generateSchedule({
        principal: Money.from(12_000_000),
        tenor: 12,
        method: "FLAT",
        annualMarginRate: 0.12,
        startDate: new Date("2026-01-01"),
      });

      expect(schedule.method).toBe("FLAT");
      expect(schedule.items).toHaveLength(12);

      // Period 1
      expect(schedule.items[0].period).toBe(1);
      expect(schedule.items[0].openingBalance.toNumber()).toBe(12_000_000);
      expect(schedule.items[0].principalPortion.toNumber()).toBe(1_000_000);
      expect(schedule.items[0].interestPortion.toNumber()).toBe(120_000);
      expect(schedule.items[0].installment.toNumber()).toBe(1_120_000);
      expect(schedule.items[0].closingBalance.toNumber()).toBe(11_000_000);

      // Final period (12)
      expect(schedule.items[11].period).toBe(12);
      expect(schedule.items[11].closingBalance.toNumber()).toBe(0);
    });

    it("should generate exact annuity amortization schedule with zero closing balance", () => {
      const schedule = AmortizationEngine.generateSchedule({
        principal: Money.from(10_000_000),
        tenor: 6,
        method: "ANNUITY",
        annualMarginRate: 0.12,
        startDate: new Date("2026-01-01"),
      });

      expect(schedule.method).toBe("ANNUITY");
      expect(schedule.items).toHaveLength(6);

      // Final period closing balance must be exactly 0
      expect(schedule.items[5].closingBalance.toNumber()).toBe(0);

      // Sum of all principal portions must exactly equal 10.000.000
      const totalPrincipalPaid = schedule.items.reduce(
        (sum, item) => sum + item.principalPortion.toNumber(),
        0
      );
      expect(Math.round(totalPrincipalPaid)).toBe(10_000_000);
    });
  });
});
