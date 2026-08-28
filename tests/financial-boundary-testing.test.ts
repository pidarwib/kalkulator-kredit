/**
 * TASK-072 — Comprehensive Financial & Business Rule Boundary Testing
 *
 * Exhaustive boundary test suite covering:
 * 1. DBR Boundary (89.99% OK, 90.00% OK, 90.01% OVER)
 * 2. Tenor Boundary (119mo OK, 120mo OK, 121mo OVER)
 * 3. Principal Limit Boundary (Below max OK, Exactly at max OK, Exceeding max OVER)
 * 4. Age & Maturity Boundary (84y 11m OK, 85y 0m OVER, Min valid age 21y OK)
 * 5. Input Safety Validation (Zero, Negative, and Missing values)
 * 6. Multi-rule Failure Aggregation (All failure reasons collected without premature return)
 */

import { describe, it, expect } from "vitest";
import { DbrService } from "@/lib/calculation/dbr-service";
import { EligibilityService } from "@/lib/calculation/eligibility-service";
import { MaximumPrincipalService } from "@/lib/calculation/maximum-principal-service";
import { CalculationInputValidator } from "@/lib/calculation/calculation-input-validator";
import { Money, Percentage } from "@/lib/domain";

describe("TASK-072: Financial & Business Rule Boundary Testing", () => {
  const calculationDate = new Date("2026-01-01");
  const defaultMaxDbr = 0.90; // 90%
  const defaultMaxTenorMonths = 120; // 120 months
  const defaultMaxProductPrincipal = Money.from(200_000_000); // 200M
  const defaultAnnualRate = 0.108; // 10.8%
  const defaultRoundingIncrement = Money.from(100_000); // 100k

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DBR BOUNDARY TESTING (89.99% vs 90.00% vs 90.01%)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. DBR Boundary Testing", () => {
    const salary = Money.from(10_000_000);

    it("should accept DBR strictly below maximum threshold (89.99%)", () => {
      const installment8999 = Money.from(8_999_000);
      const evalResult = DbrService.evaluateDbr(installment8999, salary, defaultMaxDbr);

      expect(evalResult.isValid).toBe(true);
      expect(evalResult.status).toBe("OK");
      expect(evalResult.dbr.toPercent()).toBeCloseTo(89.99, 2);
    });

    it("should accept DBR exactly at maximum threshold (90.00%)", () => {
      const installment9000 = Money.from(9_000_000);
      const evalResult = DbrService.evaluateDbr(installment9000, salary, defaultMaxDbr);

      expect(evalResult.isValid).toBe(true);
      expect(evalResult.status).toBe("OK");
      expect(evalResult.dbr.toPercent()).toBe(90.00);
    });

    it("should reject DBR exceeding maximum threshold (90.01%)", () => {
      const installment9001 = Money.from(9_001_000);
      const evalResult = DbrService.evaluateDbr(installment9001, salary, defaultMaxDbr);

      expect(evalResult.isValid).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.reason).toContain("melebihi batas maksimum");
      expect(evalResult.dbr.toPercent()).toBeCloseTo(90.01, 2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TENOR BOUNDARY TESTING (119 vs 120 vs 121 Months)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Tenor Boundary Testing", () => {
    const youngBirthDate = new Date("1995-01-01"); // Age 31 years (plenty of age buffer)

    it("should accept requested tenor of 119 months (below max)", () => {
      const evalResult = EligibilityService.evaluate({
        birthDate: youngBirthDate,
        calculationDate,
        requestedPrincipal: 50_000_000,
        requestedTenor: 119,
        monthlySalary: 10_000_000,
        monthlyInstallment: 1_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 45_000_000,
      });

      expect(evalResult.isEligible).toBe(true);
      expect(evalResult.status).toBe("OK");
    });

    it("should accept requested tenor exactly at maximum limit (120 months)", () => {
      const evalResult = EligibilityService.evaluate({
        birthDate: youngBirthDate,
        calculationDate,
        requestedPrincipal: 50_000_000,
        requestedTenor: 120,
        monthlySalary: 10_000_000,
        monthlyInstallment: 1_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 45_000_000,
      });

      expect(evalResult.isEligible).toBe(true);
      expect(evalResult.status).toBe("OK");
    });

    it("should reject requested tenor exceeding maximum limit (121 months)", () => {
      const evalResult = EligibilityService.evaluate({
        birthDate: youngBirthDate,
        calculationDate,
        requestedPrincipal: 50_000_000,
        requestedTenor: 121,
        monthlySalary: 10_000_000,
        monthlyInstallment: 1_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 45_000_000,
      });

      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.reasons.some((r) => r.includes("Tenor pengajuan") || r.includes("maksimum"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PRINCIPAL CEILING BOUNDARY TESTING (Below vs At Max vs Exceeding Max)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Principal Ceiling Boundary Testing", () => {
    const validBirthDate = new Date("1985-01-01");

    it("should accept requested principal below product ceiling (Rp 199.900.000)", () => {
      const evalResult = EligibilityService.evaluate({
        birthDate: validBirthDate,
        calculationDate,
        requestedPrincipal: 199_900_000,
        requestedTenor: 60,
        monthlySalary: 25_000_000,
        monthlyInstallment: 5_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 180_000_000,
      });

      expect(evalResult.isEligible).toBe(true);
      expect(evalResult.status).toBe("OK");
    });

    it("should accept requested principal exactly at maximum product ceiling (Rp 200.000.000)", () => {
      const evalResult = EligibilityService.evaluate({
        birthDate: validBirthDate,
        calculationDate,
        requestedPrincipal: 200_000_000,
        requestedTenor: 60,
        monthlySalary: 25_000_000,
        monthlyInstallment: 5_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 180_000_000,
      });

      expect(evalResult.isEligible).toBe(true);
      expect(evalResult.status).toBe("OK");
    });

    it("should reject requested principal exceeding maximum product ceiling (Rp 200.100.000)", () => {
      const evalResult = EligibilityService.evaluate({
        birthDate: validBirthDate,
        calculationDate,
        requestedPrincipal: 200_100_000,
        requestedTenor: 60,
        monthlySalary: 25_000_000,
        monthlyInstallment: 5_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 180_000_000,
      });

      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.reasons.some((r) => r.includes("Plafon pengajuan") || r.includes("maksimum"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. AGE & MATURITY BOUNDARY TESTING (84y 11m OK vs 85y OVER)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Age & Maturity Boundary Testing", () => {
    it("should accept debtor whose maturity age is strictly before 85 years (e.g. 84 years 11 months)", () => {
      // Calculation date: 2026-01-01
      // Tenor: 12 months -> Maturity date: 2027-01-01
      // Birth date: 1942-02-01 -> At 2027-01-01, age is 84 years 11 months
      const birthDate = new Date("1942-02-01");

      const evalResult = EligibilityService.evaluate({
        birthDate,
        calculationDate,
        requestedPrincipal: 10_000_000,
        requestedTenor: 12,
        monthlySalary: 10_000_000,
        monthlyInstallment: 1_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 8_000_000,
      });

      expect(evalResult.isEligible).toBe(true);
      expect(evalResult.status).toBe("OK");
      expect(evalResult.ageAtMaturity.years).toBe(84);
      expect(evalResult.ageAtMaturity.months).toBe(11);
    });

    it("should reject debtor whose maturity age reaches or exceeds 85 years (e.g. 85 years 0 months)", () => {
      // Calculation date: 2026-01-01
      // Tenor: 12 months -> Maturity date: 2027-01-01
      // Birth date: 1942-01-01 -> At 2027-01-01, age is exactly 85 years 0 months
      const birthDate = new Date("1942-01-01");

      const evalResult = EligibilityService.evaluate({
        birthDate,
        calculationDate,
        requestedPrincipal: 10_000_000,
        requestedTenor: 12,
        monthlySalary: 10_000_000,
        monthlyInstallment: 1_000_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 8_000_000,
      });

      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.reasons.some((r) => r.includes("Usia debitur saat kredit lunas") || r.includes("85"))).toBe(true);
    });

    it("should accept minimum valid debtor age (e.g. 21 years old)", () => {
      const birthDate21 = new Date("2005-01-01"); // Age 21 at 2026-01-01

      const evalResult = EligibilityService.evaluate({
        birthDate: birthDate21,
        calculationDate,
        requestedPrincipal: 50_000_000,
        requestedTenor: 36,
        monthlySalary: 10_000_000,
        monthlyInstallment: 1_500_000,
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: defaultMaxProductPrincipal,
        netDisbursement: 45_000_000,
      });

      expect(evalResult.isEligible).toBe(true);
      expect(evalResult.status).toBe("OK");
      expect(evalResult.ageAtCalculation.years).toBe(21);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. INPUT SAFETY VALIDATION (Zero, Negative, and Missing Values)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5. Input Safety Validation (Zero, Negative, and Malformed Inputs)", () => {
    it("should reject zero salary input (0)", async () => {
      await expect(
        CalculationInputValidator.validateOrThrow({
          productId: "dummy-id",
          birthDate: "1980-01-01",
          netSalary: 0,
          requestedPrincipal: 50_000_000,
          tenorMonths: 36,
          method: "FLAT",
        })
      ).rejects.toThrow();
    });

    it("should reject negative salary input (-5.000.000)", async () => {
      await expect(
        CalculationInputValidator.validateOrThrow({
          productId: "dummy-id",
          birthDate: "1980-01-01",
          netSalary: -5_000_000,
          requestedPrincipal: 50_000_000,
          tenorMonths: 36,
          method: "FLAT",
        })
      ).rejects.toThrow();
    });

    it("should reject zero principal (0)", async () => {
      await expect(
        CalculationInputValidator.validateOrThrow({
          productId: "dummy-id",
          birthDate: "1980-01-01",
          netSalary: 10_000_000,
          requestedPrincipal: 0,
          tenorMonths: 36,
          method: "FLAT",
        })
      ).rejects.toThrow();
    });

    it("should reject negative principal (-50.000.000)", async () => {
      await expect(
        CalculationInputValidator.validateOrThrow({
          productId: "dummy-id",
          birthDate: "1980-01-01",
          netSalary: 10_000_000,
          requestedPrincipal: -50_000_000,
          tenorMonths: 36,
          method: "FLAT",
        })
      ).rejects.toThrow();
    });

    it("should reject zero tenor (0)", async () => {
      await expect(
        CalculationInputValidator.validateOrThrow({
          productId: "dummy-id",
          birthDate: "1980-01-01",
          netSalary: 10_000_000,
          requestedPrincipal: 50_000_000,
          tenorMonths: 0,
          method: "FLAT",
        })
      ).rejects.toThrow();
    });

    it("should reject negative tenor (-12)", async () => {
      await expect(
        CalculationInputValidator.validateOrThrow({
          productId: "dummy-id",
          birthDate: "1980-01-01",
          netSalary: 10_000_000,
          requestedPrincipal: 50_000_000,
          tenorMonths: -12,
          method: "FLAT",
        })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. MULTI-RULE FAILURE AGGREGATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("6. Multi-Rule Failure Aggregation", () => {
    it("should collect all failure reasons simultaneously when multiple rules fail", () => {
      // 1. DBR fails (installment 10M > 9M max)
      // 2. Tenor fails (150mo > 120mo max)
      // 3. Principal fails (300M > 200M max)
      // 4. Maturity age fails (birth 1942, age at maturity > 85y)
      const oldBirthDate = new Date("1942-01-01");

      const evalResult = EligibilityService.evaluate({
        birthDate: oldBirthDate,
        calculationDate,
        requestedPrincipal: 300_000_000, // FAILS (max 200M)
        requestedTenor: 150, // FAILS (max 120)
        monthlySalary: 10_000_000,
        monthlyInstallment: 10_000_000, // FAILS (DBR 100% > 90%)
        maxDbr: defaultMaxDbr,
        maxProductTenorMonths: defaultMaxTenorMonths,
        maxProductPrincipal: defaultMaxProductPrincipal,
        maxPrincipalCapacity: Money.from(150_000_000), // FAILS (requested 300M > capacity 150M)
        netDisbursement: 250_000_000,
      });

      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.status).toBe("OVER");

      // Must collect multiple distinct reasons
      expect(evalResult.reasons.length).toBeGreaterThanOrEqual(3);

      const combinedText = evalResult.reasons.join(" ");
      expect(combinedText).toContain("DBR");
      expect(combinedText).toContain("Tenor");
      expect(combinedText).toContain("Plafon");
    });
  });
});
