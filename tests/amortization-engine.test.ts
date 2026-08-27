import { describe, it, expect } from "vitest";
import { AmortizationEngine } from "@/lib/calculation";
import { Money } from "@/lib/domain";

describe("TASK-034: Amortization Engine Unit Tests", () => {
  const startDate = new Date("2026-01-01");

  describe("FLAT Method Amortization Schedule", () => {
    it("should generate exact FLAT schedule with reconciliation to 0 ending balance", () => {
      const principal = Money.from(120000000); // 120M
      const tenor = 12; // 12 months

      const schedule = AmortizationEngine.generateSchedule({
        principal,
        tenor,
        method: "FLAT",
        annualMarginRate: 0.108,
        startDate,
      });

      expect(schedule.method).toBe("FLAT");
      expect(schedule.items.length).toBe(12);

      // First Period
      const firstItem = schedule.items[0];
      expect(firstItem.period).toBe(1);
      expect(firstItem.openingBalance.toNumber()).toBe(120000000);
      expect(firstItem.principalPortion.toNumber()).toBe(10000000); // 120M / 12 = 10M
      expect(firstItem.interestPortion.toNumber()).toBe(1080000); // 120M * 0.009 = 1.08M
      expect(firstItem.installment.toNumber()).toBe(11080000);
      expect(firstItem.closingBalance.toNumber()).toBe(110000000);

      // Middle Period (Period 6)
      const midItem = schedule.items[5];
      expect(midItem.period).toBe(6);
      expect(midItem.openingBalance.toNumber()).toBe(70000000);
      expect(midItem.principalPortion.toNumber()).toBe(10000000);
      expect(midItem.interestPortion.toNumber()).toBe(1080000);
      expect(midItem.closingBalance.toNumber()).toBe(60000000);

      // Final Period (Period 12)
      const lastItem = schedule.items[11];
      expect(lastItem.period).toBe(12);
      expect(lastItem.openingBalance.toNumber()).toBe(10000000);
      expect(lastItem.principalPortion.toNumber()).toBe(10000000);
      expect(lastItem.closingBalance.toNumber()).toBe(0); // Exact 0 ending balance!

      // Total Summaries
      expect(schedule.totalPrincipalPaid.toNumber()).toBe(120000000);
      expect(schedule.totalInterestPaid.toNumber()).toBe(12 * 1080000); // 12.96M
      expect(schedule.totalInstallmentsPaid.toNumber()).toBe(120000000 + 12960000);
    });
  });

  describe("ANNUITY / PMT Method Amortization Schedule", () => {
    it("should generate exact ANNUITY schedule with decreasing interest, increasing principal, and 0 final balance", () => {
      const principal = Money.from(100000000); // 100M
      const tenor = 12;

      const schedule = AmortizationEngine.generateSchedule({
        principal,
        tenor,
        method: "ANNUITY",
        annualMarginRate: 0.108,
        startDate,
      });

      expect(schedule.method).toBe("ANNUITY");
      expect(schedule.items.length).toBe(12);

      // Period 1
      const p1 = schedule.items[0];
      expect(p1.period).toBe(1);
      expect(p1.openingBalance.toNumber()).toBe(100000000);
      expect(p1.interestPortion.toNumber()).toBe(900000); // 100M * 0.009 = 900k

      // Period 2: interest should be less than period 1, principal should be more
      const p2 = schedule.items[1];
      expect(p2.interestPortion.toNumber()).toBeLessThan(p1.interestPortion.toNumber());
      expect(p2.principalPortion.toNumber()).toBeGreaterThan(p1.principalPortion.toNumber());

      // Period 12: final closing balance must be exactly 0
      const p12 = schedule.items[11];
      expect(p12.period).toBe(12);
      expect(p12.closingBalance.toNumber()).toBe(0);

      // Total principal paid across all 12 periods must equal initial 100M
      expect(schedule.totalPrincipalPaid.round(2).toNumber()).toBeCloseTo(100000000, 2);
    });
  });

  describe("Long Tenor (120 Months) Reconciliation", () => {
    it("should generate all 120 periods with exact closing balance reconciliation", () => {
      const principal = Money.from(200000000); // 200M
      const tenor = 120;

      const flatSchedule = AmortizationEngine.generateSchedule({
        principal,
        tenor,
        method: "FLAT",
        startDate,
      });

      expect(flatSchedule.items.length).toBe(120);
      expect(flatSchedule.items[119].closingBalance.toNumber()).toBe(0);
      expect(flatSchedule.totalPrincipalPaid.round(2).toNumber()).toBeCloseTo(200000000, 2);

      const annuitySchedule = AmortizationEngine.generateSchedule({
        principal,
        tenor,
        method: "ANNUITY",
        startDate,
      });

      expect(annuitySchedule.items.length).toBe(120);
      expect(annuitySchedule.items[119].closingBalance.toNumber()).toBe(0);
      expect(annuitySchedule.totalPrincipalPaid.round(2).toNumber()).toBeCloseTo(200000000, 2);
    });
  });

  describe("Boundary & Edge Cases", () => {
    it("should handle 1-month tenor boundary accurately", () => {
      const schedule = AmortizationEngine.generateSchedule({
        principal: 10000000,
        tenor: 1,
        method: "FLAT",
        startDate,
      });

      expect(schedule.items.length).toBe(1);
      expect(schedule.items[0].openingBalance.toNumber()).toBe(10000000);
      expect(schedule.items[0].principalPortion.toNumber()).toBe(10000000);
      expect(schedule.items[0].interestPortion.toNumber()).toBe(90000);
      expect(schedule.items[0].closingBalance.toNumber()).toBe(0);
    });

    it("should return empty schedule for zero principal or zero tenor", () => {
      const zeroPrincipal = AmortizationEngine.generateSchedule({
        principal: 0,
        tenor: 12,
        startDate,
      });
      expect(zeroPrincipal.items.length).toBe(0);

      const zeroTenor = AmortizationEngine.generateSchedule({
        principal: 50000000,
        tenor: 0,
        startDate,
      });
      expect(zeroTenor.items.length).toBe(0);
    });
  });
});
