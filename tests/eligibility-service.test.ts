import { describe, it, expect } from "vitest";
import { EligibilityService } from "@/lib/calculation";
import { Money, Percentage } from "@/lib/domain";

describe("TASK-032: Eligibility Engine Unit Tests", () => {
  const defaultCalculationDate = new Date("2026-01-01");
  const birthDateAge65 = new Date("1961-01-01"); // Age 65 in 2026

  describe("Fully Eligible Calculation (Status: OK)", () => {
    it("should return status OK and empty reasons when all criteria are satisfied", () => {
      const result = EligibilityService.evaluate({
        birthDate: birthDateAge65,
        calculationDate: defaultCalculationDate,
        requestedPrincipal: 100000000, // 100M
        requestedTenor: 60, // 5 years -> maturity age 70y < 85y
        monthlySalary: 10000000, // 10M
        monthlyInstallment: 2566666.67, // DBR ~25.67% <= 90%
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        maxPrincipalCapacity: 150000000,
        netDisbursement: 85000000,
      });

      expect(result.status).toBe("OK");
      expect(result.isEligible).toBe(true);
      expect(result.reasons.length).toBe(0);
      expect(result.ageAtCalculation.years).toBe(65);
      expect(result.ageAtMaturity.years).toBe(70);
      expect(result.maxTenorFinal.months).toBe(120);
      expect(result.maxPrincipalFinal.toNumber()).toBe(150000000);
      expect(result.remainingSalary.round(2).toNumber()).toBe(7433333.33);
    });
  });

  describe("Single Rule Violations (Status: OVER)", () => {
    it("should fail when DBR exceeds 90%", () => {
      const result = EligibilityService.evaluate({
        birthDate: birthDateAge65,
        calculationDate: defaultCalculationDate,
        requestedPrincipal: 100000000,
        requestedTenor: 60,
        monthlySalary: 5000000, // 5M
        monthlyInstallment: 4750000, // 95% DBR > 90%
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        maxPrincipalCapacity: 150000000,
        netDisbursement: 85000000,
      });

      expect(result.status).toBe("OVER");
      expect(result.isEligible).toBe(false);
      expect(result.reasons.length).toBe(1);
      expect(result.reasons[0]).toContain("DBR");
    });

    it("should fail when age at maturity reaches or exceeds 85 years limit", () => {
      // Debtor age 80 years + 60 months (5 years) -> maturity age 85 years
      const birthDateAge80 = new Date("1946-01-01");
      const result = EligibilityService.evaluate({
        birthDate: birthDateAge80,
        calculationDate: defaultCalculationDate,
        requestedPrincipal: 50000000,
        requestedTenor: 60, // 5 years -> age at maturity 85y
        monthlySalary: 10000000,
        monthlyInstallment: 1500000,
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        maxPrincipalCapacity: 150000000,
        netDisbursement: 40000000,
      });

      expect(result.status).toBe("OVER");
      expect(result.isEligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("Usia debitur saat lunas"))).toBe(true);
    });

    it("should fail when requested tenor exceeds max allowable tenor", () => {
      const result = EligibilityService.evaluate({
        birthDate: birthDateAge65,
        calculationDate: defaultCalculationDate,
        requestedPrincipal: 100000000,
        requestedTenor: 144, // 12 years > 10 years (120m) product limit
        monthlySalary: 10000000,
        monthlyInstallment: 1500000,
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        maxPrincipalCapacity: 150000000,
        netDisbursement: 80000000,
      });

      expect(result.status).toBe("OVER");
      expect(result.isEligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("Tenor pengajuan"))).toBe(true);
    });

    it("should fail when requested principal exceeds max allowable principal limit", () => {
      const result = EligibilityService.evaluate({
        birthDate: birthDateAge65,
        calculationDate: defaultCalculationDate,
        requestedPrincipal: 250000000, // 250M > 200M product limit
        requestedTenor: 60,
        monthlySalary: 10000000,
        monthlyInstallment: 2500000,
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        maxPrincipalCapacity: 180000000,
        netDisbursement: 180000000,
      });

      expect(result.status).toBe("OVER");
      expect(result.isEligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("Plafon pengajuan"))).toBe(true);
    });

    it("should fail when net disbursement is zero or negative", () => {
      const result = EligibilityService.evaluate({
        birthDate: birthDateAge65,
        calculationDate: defaultCalculationDate,
        requestedPrincipal: 50000000,
        requestedTenor: 36,
        monthlySalary: 10000000,
        monthlyInstallment: 1500000,
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        maxPrincipalCapacity: 150000000,
        netDisbursement: -5000000, // Negative disbursement
      });

      expect(result.status).toBe("OVER");
      expect(result.isEligible).toBe(false);
      expect(result.reasons.some((r) => r.includes("Terima bersih"))).toBe(true);
    });
  });

  describe("Multiple Reasons Aggregation per BUSINESS_RULES §40", () => {
    it("should collect all failed reasons simultaneously without early exit", () => {
      const birthDateAge82 = new Date("1944-01-01"); // Age 82
      const result = EligibilityService.evaluate({
        birthDate: birthDateAge82,
        calculationDate: defaultCalculationDate,
        requestedPrincipal: 300000000, // 300M > 200M (Principal violation)
        requestedTenor: 144, // 144m > max tenor by age (35m) & product (120m) (Tenor & Age violations)
        monthlySalary: 3000000, // 3M
        monthlyInstallment: 5000000, // DBR 166.7% > 90% (DBR violation)
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        maxPrincipalCapacity: 50000000,
        netDisbursement: -10000000, // Negative disbursement (Net disbursement violation)
      });

      expect(result.status).toBe("OVER");
      expect(result.isEligible).toBe(false);
      expect(result.reasons.length).toBe(5);

      // Verify each reason is present
      expect(result.reasons.some((r) => r.includes("DBR"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("Usia debitur saat lunas"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("Tenor pengajuan"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("Plafon pengajuan"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("Terima bersih"))).toBe(true);
    });
  });

  describe("Exact Boundary Compliance", () => {
    it("should approve exact 90.00% DBR, exact 120m tenor, and exact 200M principal as OK", () => {
      const result = EligibilityService.evaluate({
        birthDate: birthDateAge65,
        calculationDate: defaultCalculationDate,
        requestedPrincipal: 200000000, // Exact 200M
        requestedTenor: 120, // Exact 120m
        monthlySalary: 10000000,
        monthlyInstallment: 9000000, // Exact 90%
        maxDbr: 0.90,
        maxProductTenorMonths: 120,
        maxProductPrincipal: 200000000,
        maxPrincipalCapacity: 200000000,
        netDisbursement: 1000000,
      });

      expect(result.status).toBe("OK");
      expect(result.isEligible).toBe(true);
      expect(result.reasons.length).toBe(0);
    });
  });
});
