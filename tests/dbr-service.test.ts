import { describe, it, expect } from "vitest";
import { DbrService } from "@/lib/calculation";
import { Money, Percentage } from "@/lib/domain";

describe("TASK-031: DBR Calculation Service Unit Tests", () => {
  describe("Standard DBR & Capacity Calculations", () => {
    it("should calculate DBR, max installment, and remaining salary accurately", () => {
      const salary = Money.from(10000000); // 10M
      const installment = Money.from(3466666.67);

      const dbr = DbrService.calculateDbr(installment, salary);
      expect(dbr.toPercent()).toBeCloseTo(34.67, 2);

      const maxInstallment = DbrService.calculateMaxInstallment(salary, 0.90);
      expect(maxInstallment.toNumber()).toBe(9000000); // 10M * 90%

      const remainingSalary = DbrService.calculateRemainingSalary(salary, installment);
      expect(remainingSalary.round(2).toNumber()).toBe(6533333.33);

      const evalResult = DbrService.evaluateDbr(installment, salary, 0.90);
      expect(evalResult.isValid).toBe(true);
      expect(evalResult.status).toBe("OK");
      expect(evalResult.reason).toBeUndefined();
    });
  });

  describe("Exact 90% Threshold Boundary Rule per BUSINESS_RULES §9.1", () => {
    it("should approve exact 90.00% threshold as OK", () => {
      const salary = Money.from(10000000);
      const exactInstallment = Money.from(9000000); // Exactly 90%

      const evalResult = DbrService.evaluateDbr(exactInstallment, salary, 0.90);
      expect(evalResult.dbr.toPercent()).toBe(90);
      expect(evalResult.isValid).toBe(true);
      expect(evalResult.status).toBe("OK");
    });

    it("should reject installment exceeding 90% by even 1 rupiah as OVER", () => {
      const salary = Money.from(10000000);
      const overInstallment = Money.from(9000001); // 90.00001%

      const evalResult = DbrService.evaluateDbr(overInstallment, salary, 0.90);
      expect(evalResult.dbr.toPercent()).toBeGreaterThan(90);
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.reason).toContain("melebihi batas maksimum");
    });
  });

  describe("Internal Numeric Precision vs Display Rounding", () => {
    it("should evaluate unrounded internal decimals strictly", () => {
      const salary = Money.from(10000000);
      const installment = Money.from(9004000); // 90.04%

      const evalResult = DbrService.evaluateDbr(installment, salary, 0.90);
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.status).toBe("OVER");
    });
  });

  describe("Negative Remaining Salary & Over-limit Scenarios", () => {
    it("should calculate negative remaining salary when installment exceeds net income", () => {
      const salary = Money.from(4000000);
      const installment = Money.from(4500000); // 112.5% DBR

      const evalResult = DbrService.evaluateDbr(installment, salary, 0.90);
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.remainingSalary.toNumber()).toBe(-500000);
      expect(evalResult.dbr.toPercent()).toBe(112.5);
    });
  });

  describe("Zero & Edge Case Handlers", () => {
    it("should handle zero salary gracefully as OVER", () => {
      const salary = Money.from(0);
      const installment = Money.from(1000000);

      const evalResult = DbrService.evaluateDbr(installment, salary, 0.90);
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.status).toBe("OVER");
      expect(evalResult.dbr.toPercent()).toBe(100);
    });
  });
});
