import { describe, it, expect } from "vitest";
import { FlatCalculationStrategy } from "@/lib/calculation";
import { Money, Percentage, Tenor } from "@/lib/domain";

describe("TASK-027: FlatCalculationStrategy Unit Tests", () => {
  const strategy = new FlatCalculationStrategy();

  describe("Normal Principal and Tenor Calculations", () => {
    it("should calculate exact flat installment, DBR, and capacity for standard case", () => {
      // Principal: 100M, Tenor: 60m (5y), Salary: 10M, Annual Rate: 10.8%
      const result = strategy.calculate({
        principal: 100000000,
        tenor: 60,
        monthlySalary: 10000000,
        annualMarginRate: 0.108,
        maxDbr: 0.9,
        maxProductPrincipal: 200000000,
        principalRoundingIncrement: 100000,
      });

      expect(result.method).toBe("FLAT");
      expect(result.interestRate.annualRate.toDecimal()).toBe(0.108);
      expect(result.interestRate.monthlyRate.toDecimal()).toBe(0.009);

      // 1. Installment breakdown:
      // Pokok = 100.000.000 / 60 = 1.666.666,67
      expect(result.installment.principalPortion.round(2).toNumber()).toBe(1666666.67);
      // Margin = 100.000.000 * 0.009 = 900.000
      expect(result.installment.interestPortion.toNumber()).toBe(900000);
      // Total Installment = 1.666.666,67 + 900.000 = 2.566.666,67
      expect(result.installment.monthlyInstallment.round(2).toNumber()).toBe(2566666.67);

      // 2. DBR & Remaining Salary:
      // DBR = 2.566.666,67 / 10.000.000 = 25.67%
      expect(result.dbr.toPercent()).toBeCloseTo(25.67, 1);
      // Remaining = 10.000.000 - 2.566.666,67 = 7.433.333,33
      expect(result.remainingSalary.round(2).toNumber()).toBe(7433333.33);

      // 3. Max Installment & Capacity per BUSINESS_RULES.md Section 16:
      // Max Installment = 10.000.000 * 0.90 = 9.000.000
      expect(result.maxInstallment.toNumber()).toBe(9000000);
      // Raw Capacity = (9.000.000 * 60) / (1 + 0.009 * 60) = 540.000.000 / 1.54 = 350.649.350,65
      expect(result.rawMaxPrincipalCapacity.round(2).toNumber()).toBeCloseTo(350649350.65, 1);
      // Rounded Capacity = FLOOR(350.649.350,65, 100.000) = 350.600.000
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(350600000);
      // Max Principal Final = MIN(350.600.000, 200.000.000) = 200.000.000
      expect(result.maxPrincipalFinal.toNumber()).toBe(200000000);

      expect(result.isDbrValid).toBe(true);
      expect(result.isPrincipalValid).toBe(true);
    });

    it("should calculate 120 months (10 years) standard case for maximum product limit", () => {
      // Principal: 200M, Tenor: 120m, Salary: 10M, Annual Rate: 10.8%
      const result = strategy.calculate({
        principal: 200000000,
        tenor: 120,
        monthlySalary: 10000000,
      });

      // Pokok = 200.000.000 / 120 = 1.666.666,67
      expect(result.installment.principalPortion.round(2).toNumber()).toBe(1666666.67);
      // Margin = 200.000.000 * 0.009 = 1.800.000
      expect(result.installment.interestPortion.toNumber()).toBe(1800000);
      // Total = 3.466.666,67
      expect(result.installment.monthlyInstallment.round(2).toNumber()).toBe(3466666.67);

      // Raw Capacity = (9.000.000 * 120) / (1 + 0.009 * 120) = 1.080.000.000 / 2.08 = 519.230.769,23
      expect(result.rawMaxPrincipalCapacity.round(2).toNumber()).toBeCloseTo(519230769.23, 1);
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(519200000);
      expect(result.maxPrincipalFinal.toNumber()).toBe(200000000);

      // DBR = 3.466.666,67 / 10.000.000 = 34.67% <= 90%
      expect(result.isDbrValid).toBe(true);
      expect(result.isPrincipalValid).toBe(true);
    });
  });

  describe("Boundary Tenors", () => {
    it("should calculate 1 month boundary tenor correctly", () => {
      const result = strategy.calculate({
        principal: 10000000, // 10M
        tenor: 1,
        monthlySalary: 20000000,
      });

      // Pokok = 10.000.000 / 1 = 10.000.000
      expect(result.installment.principalPortion.toNumber()).toBe(10000000);
      // Margin = 10.000.000 * 0.009 = 90.000
      expect(result.installment.interestPortion.toNumber()).toBe(90000);
      // Total = 10.090.000
      expect(result.installment.monthlyInstallment.toNumber()).toBe(10090000);
      expect(result.isDbrValid).toBe(true);
    });
  });

  describe("Boundary Principals and Validation Flags", () => {
    it("should allow principal exactly equal to maximum capacity (OK)", () => {
      const result = strategy.calculate({
        principal: 200000000, // exact product maximum
        tenor: 120,
        monthlySalary: 10000000,
      });

      expect(result.isPrincipalValid).toBe(true);
    });

    it("should invalidate principal exceeding max allowable final limit (OVER)", () => {
      const result = strategy.calculate({
        principal: 200100000, // exceeds 200M product maximum
        tenor: 120,
        monthlySalary: 10000000,
      });

      expect(result.isPrincipalValid).toBe(false);
    });

    it("should invalidate when DBR exceeds 90% threshold (OVER)", () => {
      // Low salary: Rp 3.000.000 with monthly installment Rp 3.466.667 -> DBR > 100%
      const result = strategy.calculate({
        principal: 200000000,
        tenor: 120,
        monthlySalary: 3000000,
      });

      expect(result.dbr.toPercent()).toBeGreaterThan(90);
      expect(result.isDbrValid).toBe(false);
    });
  });

  describe("Rounding and Increments", () => {
    it("should always floor capacity down to nearest Rp 100.000 increment", () => {
      // If raw capacity is Rp 98.765.432, it must floor to Rp 98.700.000 per §19
      const result = strategy.calculate({
        principal: 50000000,
        tenor: 24,
        monthlySalary: 5000000, // Max Installment = 4.5M -> Raw Cap = 4.5M*24 / (1 + 0.009*24) = 108M / 1.216 = 88.815.789,47
      });

      expect(result.rawMaxPrincipalCapacity.toNumber()).toBeCloseTo(88815789.47, 1);
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(88800000);
      expect(result.roundedMaxPrincipalCapacity.toNumber() % 100000).toBe(0);
    });
  });

  describe("Zero and Invalid Value Handlers", () => {
    it("should handle zero tenor and zero salary safely without division by zero errors", () => {
      const resultZeroTenor = strategy.calculate({
        principal: 50000000,
        tenor: 0,
        monthlySalary: 5000000,
      });

      expect(resultZeroTenor.installment.principalPortion.toNumber()).toBe(0);
      expect(resultZeroTenor.rawMaxPrincipalCapacity.toNumber()).toBe(0);

      const resultZeroSalary = strategy.calculate({
        principal: 50000000,
        tenor: 12,
        monthlySalary: 0,
      });

      expect(resultZeroSalary.dbr.toPercent()).toBe(100);
      expect(resultZeroSalary.isDbrValid).toBe(false);
      expect(resultZeroSalary.rawMaxPrincipalCapacity.toNumber()).toBe(0);
    });
  });
});
