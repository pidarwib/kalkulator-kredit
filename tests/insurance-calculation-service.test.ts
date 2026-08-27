import { describe, it, expect, beforeAll } from "vitest";
import {
  InsuranceCalculationService,
  MissingInsuranceRateError,
} from "@/lib/calculation";
import { db } from "@/lib/db";
import { Money } from "@/lib/domain";

describe("TASK-029: Insurance Calculation Service Unit & Integration Tests", () => {
  let seededProductId: string;

  beforeAll(async () => {
    const product = await db.product.findFirst({
      where: { code: "PLATINUM_MADIUN" },
    });

    if (!product) {
      throw new Error("Seeded product PLATINUM_MADIUN not found");
    }

    seededProductId = product.id;
  }, 45000);

  describe("Standard Insurance Premium & Charges Calculation", () => {
    it("should calculate exact insurance breakdown from reference master rates", async () => {
      // Principal: 200M, Tenor: 60 months (5 years), Age: 65
      const principal = Money.from(200000000);
      const result = await InsuranceCalculationService.calculate({
        productId: seededProductId,
        principal,
        tenor: 60,
        age: 65,
      });

      expect(result.productId).toBe(seededProductId);
      expect(result.currentAge).toBe(65);
      expect(result.nextAge).toBe(66);
      expect(result.tenorMonths).toBe(60);
      expect(result.tenorYears).toBe(5); // 60 / 12 = 5

      // Rates must be valid numbers from DB
      expect(result.currentAgeRate).not.toBeNull();
      expect(result.nextAgeRate).not.toBeNull();
      expect(result.selectedPremiumRate.toDecimal()).toBeGreaterThan(0);

      // Section 25 Rule: MAX(rate1, rate2)
      const expectedSelected = Math.max(
        result.currentAgeRate!.toDecimal(),
        result.nextAgeRate!.toDecimal()
      );
      expect(result.selectedPremiumRate.toDecimal()).toBe(expectedSelected);

      // Breakdown checks:
      // Fronting = 6% per seeded fee parameter
      expect(result.frontingRate.toDecimal()).toBe(0.06);
      expect(result.premium.frontingAmount.toNumber()).toBe(12000000); // 200M * 6%

      // Reserve = 21.5% per seeded fee parameter
      expect(result.reserveRate.toDecimal()).toBe(0.215);
      expect(result.premium.reserveAmount.toNumber()).toBe(43000000); // 200M * 21.5%

      // Base premium = 200M * selectedPremiumRate
      const expectedBasePremium = 200000000 * expectedSelected;
      expect(result.premium.premiumAmount.toNumber()).toBeCloseTo(expectedBasePremium, 2);

      // Total Insurance Charge = Base Premium + Fronting + Reserve
      const expectedTotal = expectedBasePremium + 12000000 + 43000000;
      expect(result.premium.totalInsuranceCharge.toNumber()).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe("Tenor Ceiling Rule per BUSINESS_RULES.md Section 23.1", () => {
    it("should ceiling 25 months to 3 insurance years", async () => {
      const result = await InsuranceCalculationService.calculate({
        productId: seededProductId,
        principal: 50000000,
        tenor: 25, // 25 months -> 3 years
        age: 65,
      });

      expect(result.tenorMonths).toBe(25);
      expect(result.tenorYears).toBe(3); // CEILING(25 / 12) = 3
    });

    it("should ceiling 13 months to 2 insurance years", async () => {
      const result = await InsuranceCalculationService.calculate({
        productId: seededProductId,
        principal: 50000000,
        tenor: 13, // 13 months -> 2 years
        age: 65,
      });

      expect(result.tenorMonths).toBe(13);
      expect(result.tenorYears).toBe(2); // CEILING(13 / 12) = 2
    });

    it("should evaluate 12 months as exactly 1 insurance year", async () => {
      const result = await InsuranceCalculationService.calculate({
        productId: seededProductId,
        principal: 50000000,
        tenor: 12,
        age: 65,
      });

      expect(result.tenorMonths).toBe(12);
      expect(result.tenorYears).toBe(1);
    });
  });

  describe("CRITICAL RULE: Missing Rate Handling", () => {
    it("should throw MissingInsuranceRateError when official rate is missing (NO AI estimation)", async () => {
      // Out-of-bounds age (99 years) and tenor (25 years)
      await expect(
        InsuranceCalculationService.calculate({
          productId: seededProductId,
          principal: 100000000,
          tenor: 300, // 25 years
          age: 99,
        })
      ).rejects.toThrow(MissingInsuranceRateError);
    });
  });
});
