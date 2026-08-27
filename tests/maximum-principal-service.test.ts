import { describe, it, expect } from "vitest";
import { MaximumPrincipalService } from "@/lib/calculation";
import { Money } from "@/lib/domain";

describe("TASK-033: Maximum Principal Calculation Service Unit Tests", () => {
  const calcDate = new Date("2026-01-01");
  const birthDateAge65 = new Date("1961-01-01"); // Age 65

  describe("FLAT Method Maximum Principal", () => {
    it("should calculate exact FLAT capacity, floor rounding, and cap at product limit", () => {
      const result = MaximumPrincipalService.calculate({
        monthlySalary: 10000000, // 10M
        birthDate: birthDateAge65,
        calculationDate: calcDate,
        method: "FLAT",
        requestedTenorMonths: 60,
        annualMarginRate: 0.108,
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        principalRoundingIncrement: 100000,
      });

      expect(result.method).toBe("FLAT");
      expect(result.maxInstallment.toNumber()).toBe(9000000);
      expect(result.evaluatedTenorMonths).toBe(60);

      // Raw Capacity = (9M * 60) / (1 + 0.009 * 60) = 540M / 1.54 = 350.649.350,65
      expect(result.rawMaxPrincipalCapacity.round(2).toNumber()).toBeCloseTo(350649350.65, 1);
      // Floor to 100k
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(350600000);
      // Capped at 200M product max
      expect(result.maxPrincipalFinal.toNumber()).toBe(200000000);
    });

    it("should allow final principal when capacity is lower than product limit", () => {
      const result = MaximumPrincipalService.calculate({
        monthlySalary: 3000000, // 3M -> Max Installment = 2.7M
        birthDate: birthDateAge65,
        calculationDate: calcDate,
        method: "FLAT",
        requestedTenorMonths: 24,
        maxProductPrincipal: 200000000,
      });

      // Raw Capacity = (2.7M * 24) / (1 + 0.009 * 24) = 64.8M / 1.216 = 53.289.473,68
      expect(result.rawMaxPrincipalCapacity.round(2).toNumber()).toBeCloseTo(53289473.68, 1);
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(53200000);
      // Final is 53.2M (not 200M)
      expect(result.maxPrincipalFinal.toNumber()).toBe(53200000);
    });
  });

  describe("ANNUITY / PV Method Maximum Principal", () => {
    it("should calculate exact ANNUITY present value capacity and floor rounding", () => {
      const result = MaximumPrincipalService.calculate({
        monthlySalary: 5000000, // 5M -> Max Installment = 4.5M
        birthDate: birthDateAge65,
        calculationDate: calcDate,
        method: "ANNUITY",
        requestedTenorMonths: 36,
        maxProductPrincipal: 200000000,
      });

      expect(result.method).toBe("ANNUITY");
      // PV = 4.5M * (1 - 1.009^-36) / 0.009 = 137.850.391,70
      expect(result.rawMaxPrincipalCapacity.round(2).toNumber()).toBeCloseTo(137850391.70, 1);
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(137800000);
      expect(result.maxPrincipalFinal.toNumber()).toBe(137800000);
    });
  });

  describe("Age-Constrained Maximum Tenor Impact on Principal Capacity", () => {
    it("should automatically constrain evaluated tenor to remaining months until max age", () => {
      // Debtor age 82 years (born 1944-01-01) -> Max age 84y 11m -> Remaining tenor = 35 months
      const birthDateAge82 = new Date("1944-01-01");
      const result = MaximumPrincipalService.calculate({
        monthlySalary: 10000000,
        birthDate: birthDateAge82,
        calculationDate: calcDate,
        method: "FLAT",
        requestedTenorMonths: 120, // requested 120 months, but age only permits 35m
        maxProductTenorMonths: 120,
      });

      expect(result.maxTenorAgeMonths).toBe(35);
      expect(result.maxTenorFinalMonths).toBe(35);
      expect(result.evaluatedTenorMonths).toBe(35); // Capped at 35m

      // Capacity is calculated for 35m, not 120m:
      // (9M * 35) / (1 + 0.009 * 35) = 315M / 1.315 = 239.543.726,24
      expect(result.rawMaxPrincipalCapacity.round(2).toNumber()).toBeCloseTo(239543726.24, 1);
      expect(result.roundedMaxPrincipalCapacity.toNumber()).toBe(239500000);
    });
  });

  describe("Requested Principal Validation Check", () => {
    it("should evaluate isRequestedPrincipalValid as true when within final limit and false when exceeding", () => {
      const validCheck = MaximumPrincipalService.calculate({
        monthlySalary: 10000000,
        birthDate: birthDateAge65,
        calculationDate: calcDate,
        method: "FLAT",
        requestedTenorMonths: 60,
        requestedPrincipal: 150000000, // 150M <= 200M
      });
      expect(validCheck.isRequestedPrincipalValid).toBe(true);

      const invalidCheck = MaximumPrincipalService.calculate({
        monthlySalary: 10000000,
        birthDate: birthDateAge65,
        calculationDate: calcDate,
        method: "FLAT",
        requestedTenorMonths: 60,
        requestedPrincipal: 250000000, // 250M > 200M
      });
      expect(invalidCheck.isRequestedPrincipalValid).toBe(false);
    });
  });
});
