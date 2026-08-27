import { describe, it, expect, beforeAll } from "vitest";
import { CalculationInputValidator, calculateAgeBreakdown } from "@/lib/calculation";
import { db } from "@/lib/db";
import { Money } from "@/lib/domain";

describe("TASK-026: Calculation Input Validator & Age Breakdown", () => {
  let seededProductId: string;
  let seededBprId: string;
  let validPaymentOfficeId: string;
  let foreignPaymentOfficeId: string;

  beforeAll(async () => {
    // 1. Fetch seeded BPR and Product
    const bpr = await db.bpr.findUnique({
      where: { code: "BPR_KOTA_MADIUN" },
      include: {
        products: { where: { code: "PLATINUM_MADIUN" } },
        paymentOffices: true,
      },
    });

    if (!bpr || bpr.products.length === 0 || bpr.paymentOffices.length === 0) {
      throw new Error("Required seed data not found for BPR Kota Madiun");
    }

    seededBprId = bpr.id;
    seededProductId = bpr.products[0].id;
    validPaymentOfficeId = bpr.paymentOffices[0].id;

    // 2. Create another BPR and Payment Office to test cross-BPR relationship validation
    const otherBpr = await db.bpr.create({
      data: {
        code: `BPR_VAL_${Date.now()}`,
        name: "BPR Validator Test",
      },
    });

    const otherOffice = await db.paymentOffice.create({
      data: {
        bprId: otherBpr.id,
        code: `PO_OTHER_${Date.now()}`,
        name: "Other BPR Office",
      },
    });
    foreignPaymentOfficeId = otherOffice.id;
  }, 45000);

  describe("calculateAgeBreakdown() Helper", () => {
    it("should calculate exact calendar years, months, and days", () => {
      const birthDate = new Date("1960-05-15");
      const calcDate = new Date("2026-08-27");

      const age = calculateAgeBreakdown(birthDate, calcDate);
      expect(age.years).toBe(66);
      expect(age.months).toBe(3);
      expect(age.days).toBe(12);
      expect(age.totalMonths).toBe(66 * 12 + 3);
    });
  });

  describe("CalculationInputValidator.validate()", () => {
    it("should succeed for valid input with FLAT method", async () => {
      const result = await CalculationInputValidator.validate({
        productId: seededProductId,
        paymentOfficeId: validPaymentOfficeId,
        birthDate: "1965-01-01",
        calculationDate: "2026-01-01",
        netSalary: 10000000,
        otherIncome: 2000000,
        requestedPrincipal: 100000000,
        tenorMonths: 60,
        method: "FLAT",
        settlementPayoff: 10000000,
        otherDeductions: 500000,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.data).not.toBeNull();

      if (result.data) {
        expect(result.data.product.id).toBe(seededProductId);
        expect(result.data.bprId).toBe(seededBprId);
        expect(result.data.method).toBe("FLAT");
        expect(result.data.netSalary.toNumber()).toBe(10000000);
        expect(result.data.totalIncome.toNumber()).toBe(12000000);
        expect(result.data.requestedPrincipal.toNumber()).toBe(100000000);
        expect(result.data.tenor.months).toBe(60);
        expect(result.data.creditParameter).toBeDefined();
        expect(result.data.feeParameter).toBeDefined();
        expect(result.data.interestRate.annualRate.toDecimal()).toBe(0.108);
      }
    });

    it("should succeed for valid input with ANNUITY method", async () => {
      const result = await CalculationInputValidator.validate({
        productId: seededProductId,
        birthDate: "1970-06-15",
        netSalary: 15000000,
        requestedPrincipal: 150000000,
        tenorMonths: 120,
        method: "ANNUITY",
      });

      expect(result.isValid).toBe(true);
      expect(result.data?.method).toBe("ANNUITY");
    });

    it("should reject non-existent or invalid Product ID (400)", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const result = await CalculationInputValidator.validate({
        productId: fakeId,
        birthDate: "1970-01-01",
        netSalary: 10000000,
        requestedPrincipal: 50000000,
        tenorMonths: 60,
        method: "FLAT",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "PRODUCT_NOT_AVAILABLE")).toBe(true);
    });

    it("HIERARCHY VALIDATION: should reject payment office from another BPR", async () => {
      const result = await CalculationInputValidator.validate({
        productId: seededProductId, // BPR Kota Madiun
        paymentOfficeId: foreignPaymentOfficeId, // Other BPR
        birthDate: "1970-01-01",
        netSalary: 10000000,
        requestedPrincipal: 50000000,
        tenorMonths: 60,
        method: "FLAT",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_RELATIONSHIP")).toBe(true);
    });

    it("should reject debtor younger than 18 years (MINIMUM_AGE_VIOLATION)", async () => {
      const result = await CalculationInputValidator.validate({
        productId: seededProductId,
        birthDate: "2015-01-01", // ~11 years old
        calculationDate: "2026-01-01",
        netSalary: 10000000,
        requestedPrincipal: 50000000,
        tenorMonths: 60,
        method: "FLAT",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MINIMUM_AGE_VIOLATION")).toBe(true);
    });

    it("should reject debtor already 85 years old or above (MAXIMUM_AGE_VIOLATION)", async () => {
      const result = await CalculationInputValidator.validate({
        productId: seededProductId,
        birthDate: "1940-01-01", // 86 years old in 2026
        calculationDate: "2026-01-01",
        netSalary: 10000000,
        requestedPrincipal: 50000000,
        tenorMonths: 60,
        method: "FLAT",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MAXIMUM_AGE_VIOLATION")).toBe(true);
    });

    it("should reject future birth dates", async () => {
      const result = await CalculationInputValidator.validate({
        productId: seededProductId,
        birthDate: "2030-01-01",
        calculationDate: "2026-01-01",
        netSalary: 10000000,
        requestedPrincipal: 50000000,
        tenorMonths: 60,
        method: "FLAT",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "FUTURE_BIRTH_DATE")).toBe(true);
    });

    it("should reject invalid salary, negative principal, and invalid method", async () => {
      const result = await CalculationInputValidator.validate({
        productId: seededProductId,
        birthDate: "1970-01-01",
        netSalary: -5000000, // invalid
        requestedPrincipal: 0, // invalid
        tenorMonths: 0, // invalid
        method: "BALLOON" as any, // invalid method
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
