import { describe, it, expect } from "vitest";
import {
  AnnuityCalculationStrategy,
  FlatCalculationStrategy,
} from "@/lib/calculation";

describe("TASK-028: AnnuityCalculationStrategy Unit Tests", () => {
  const annuityStrategy = new AnnuityCalculationStrategy();
  const flatStrategy = new FlatCalculationStrategy();

  describe("Normal Principal and Tenor Calculations (PMT Formula)", () => {
    it("should calculate exact PMT installment, DBR, and PV capacity for standard case", () => {
      // Principal: 200M, Tenor: 120m (10y), Salary: 10M, Annual Rate: 10.8%
      const result = annuityStrategy.calculate({
        principal: 200000000,
        tenor: 120,
        monthlySalary: 10000000,
        annualMarginRate: 0.108,
        maxDbr: 0.9,
        maxProductPrincipal: 200000000,
        principalRoundingIncrement: 100000,
      });

      expect(result.method).toBe("ANNUITY");
      expect(result.interestRate.annualRate.toDecimal()).toBe(0.108);
      expect(result.interestRate.monthlyRate.toDecimal()).toBe(0.009); // 10.8% / 12 = 0.9%

      // 1. PMT Installment Breakdown:
      // PMT(0.9%, 120, 200M) = 2.732.406,72
      expect(result.installment.monthlyInstallment.round(2).toNumber()).toBe(2732406.72);
      // Interest portion Month 1 = 200M * 0.9% = 1.800.000
      expect(result.installment.interestPortion.toNumber()).toBe(1800000);
      // Principal portion Month 1 = 2.732.406,72 - 1.800.000 = 932.406,72
      expect(result.installment.principalPortion.round(2).toNumber()).toBe(932406.72);

      // 2. DBR & Remaining Salary:
      // DBR = 2.732.406,72 / 10.000.000 = 27.32%
      expect(result.dbr.toPercent()).toBeCloseTo(27.32, 1);
      // Remaining = 10.000.000 - 2.732.406,72 = 7.267.593,28
      expect(result.remainingSalary.round(2).toNumber()).toBe(7267593.28);

      // 3. Max Installment & PV Capacity per BUSINESS_RULES.md Section 17:
      // Max Installment = 10M * 0.9 = 9.000.000
      expect(result.maxInstallment.toNumber()).toBe(9000000);
      // PV = 9.000.000 * (1 - 1.009^-120) / 0.009 = 658.759.907,06
      expect(result.rawMaxPrincipalCapacity.round(2).toNumber()).toBeCloseTo(658759907.06, 1);
      // Rounded Capacity = FLOOR(658.759.907,06, 100.000) = 658.700.000
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(658700000);
      // Max Principal Final = MIN(658.700.000, 200.000.000) = 200.000.000
      expect(result.maxPrincipalFinal.toNumber()).toBe(200000000);

      expect(result.isDbrValid).toBe(true);
      expect(result.isPrincipalValid).toBe(true);
    });

    it("should calculate PMT for 60 months (5 years) accurately", () => {
      // Principal: 100M, Tenor: 60m, Salary: 10M, Annual Rate: 10.8%
      const result = annuityStrategy.calculate({
        principal: 100000000,
        tenor: 60,
        monthlySalary: 10000000,
      });

      // PMT(0.9%, 60, 100M) = 2.164.281,43
      expect(result.installment.monthlyInstallment.round(2).toNumber()).toBeCloseTo(2164281.43, 1);
      expect(result.installment.interestPortion.toNumber()).toBe(900000);
      expect(result.installment.principalPortion.round(2).toNumber()).toBeCloseTo(1264281.43, 1);
    });
  });

  describe("Mathematical Consistency (PMT <-> PV Inverse Relationship)", () => {
    it("should produce exact PMT matching max installment when principal equals raw PV capacity", () => {
      const salary = 8000000; // 8M
      const tenor = 72; // 6 years
      const maxDbr = 0.9;
      const expectedInstallment = salary * maxDbr; // 7.2M

      const capacityResult = annuityStrategy.calculate({
        principal: 50000000,
        tenor,
        monthlySalary: salary,
        maxDbr,
      });

      const rawPv = capacityResult.rawMaxPrincipalCapacity;

      // Now calculate PMT on this exact raw PV:
      const pmtResult = annuityStrategy.calculate({
        principal: rawPv,
        tenor,
        monthlySalary: salary,
      });

      // PMT of PV must equal original expected installment (7.200.000)
      expect(pmtResult.installment.monthlyInstallment.round(2).toNumber()).toBeCloseTo(
        expectedInstallment,
        1
      );
    });
  });

  describe("Comparison: FLAT vs ANNUITY Behavior", () => {
    it("should demonstrate lower monthly installment in ANNUITY than FLAT for same principal & tenor", () => {
      const input = {
        principal: 150000000,
        tenor: 60,
        monthlySalary: 12000000,
        annualMarginRate: 0.108,
      };

      const flatResult = flatStrategy.calculate(input);
      const annuityResult = annuityStrategy.calculate(input);

      // FLAT monthly installment = (150M/60) + (150M*0.009) = 2.5M + 1.35M = 3.850.000
      expect(flatResult.installment.monthlyInstallment.toNumber()).toBe(3850000);
      // ANNUITY monthly installment = PMT(0.9%, 60, 150M) = 3.246.422,14
      expect(annuityResult.installment.monthlyInstallment.round(2).toNumber()).toBeCloseTo(
        3246422.14,
        1
      );

      // ANNUITY monthly installment < FLAT monthly installment
      expect(
        annuityResult.installment.monthlyInstallment.lessThan(
          flatResult.installment.monthlyInstallment
        )
      ).toBe(true);

      // ANNUITY PV Capacity > FLAT Capacity for the same income
      expect(
        annuityResult.rawMaxPrincipalCapacity.greaterThan(
          flatResult.rawMaxPrincipalCapacity
        )
      ).toBe(true);
    });
  });

  describe("Boundary Values and Validation Flags", () => {
    it("should calculate 1 month boundary tenor accurately", () => {
      const result = annuityStrategy.calculate({
        principal: 10000000,
        tenor: 1,
        monthlySalary: 20000000,
      });

      // PMT for 1 month = 10M * (1 + 0.009) = 10.090.000
      expect(result.installment.monthlyInstallment.toNumber()).toBe(10090000);
      expect(result.installment.interestPortion.toNumber()).toBe(90000);
      expect(result.installment.principalPortion.toNumber()).toBe(10000000);
      expect(result.isDbrValid).toBe(true);
    });

    it("should validate when principal is within final limit and invalidate when exceeding", () => {
      const valid = annuityStrategy.calculate({
        principal: 200000000,
        tenor: 120,
        monthlySalary: 10000000,
      });
      expect(valid.isPrincipalValid).toBe(true);

      const invalid = annuityStrategy.calculate({
        principal: 200050000, // exceeds 200M max product limit
        tenor: 120,
        monthlySalary: 10000000,
      });
      expect(invalid.isPrincipalValid).toBe(false);
    });

    it("should invalidate when DBR exceeds threshold", () => {
      const overDbr = annuityStrategy.calculate({
        principal: 200000000,
        tenor: 120,
        monthlySalary: 2500000, // Installment ~2.73M > 90% of 2.5M
      });

      expect(overDbr.dbr.toPercent()).toBeGreaterThan(90);
      expect(overDbr.isDbrValid).toBe(false);
    });
  });

  describe("Rounding Increments", () => {
    it("should floor PV capacity to Rp 100.000 increments", () => {
      const result = annuityStrategy.calculate({
        principal: 50000000,
        tenor: 36,
        monthlySalary: 5000000, // Max Installment = 4.5M
      });

      // PV = 4.5M * (1 - 1.009^-36) / 0.009 = 137.850.391,70
      expect(result.rawMaxPrincipalCapacity.toNumber()).toBeCloseTo(137850391.70, 1);
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(137800000);
      expect(result.roundedMaxPrincipalCapacity.toNumber() % 100000).toBe(0);
    });
  });

  describe("Zero & Invalid Handlers", () => {
    it("should handle zero tenor and zero salary safely without errors", () => {
      const zeroTenor = annuityStrategy.calculate({
        principal: 50000000,
        tenor: 0,
        monthlySalary: 5000000,
      });

      expect(zeroTenor.installment.monthlyInstallment.toNumber()).toBe(0);
      expect(zeroTenor.rawMaxPrincipalCapacity.toNumber()).toBe(0);

      const zeroSalary = annuityStrategy.calculate({
        principal: 50000000,
        tenor: 12,
        monthlySalary: 0,
      });

      expect(zeroSalary.dbr.toPercent()).toBe(100);
      expect(zeroSalary.isDbrValid).toBe(false);
      expect(zeroSalary.rawMaxPrincipalCapacity.toNumber()).toBe(0);
    });
  });
});
