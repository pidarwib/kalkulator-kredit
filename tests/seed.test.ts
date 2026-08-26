import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

describe("TASK-009: Core Master Data Seed Verification", () => {
  it("should have all 3 canonical roles seeded", async () => {
    const roles = await db.role.findMany({ orderBy: { code: "asc" } });
    const codes = roles.map((r) => r.code);

    expect(codes).toContain("SUPER_ADMIN");
    expect(codes).toContain("ADMIN");
    expect(codes).toContain("MARKETING");
  });

  it("should have 40 canonical permissions seeded according to ROLE_PERMISSION.md", async () => {
    const permCount = await db.permission.count();
    expect(permCount).toBe(40);

    const userCreate = await db.permission.findUnique({
      where: { code: "USER_CREATE" },
    });
    expect(userCreate).toBeDefined();
    expect(userCreate?.module).toBe("USER");

    const creditCalc = await db.permission.findUnique({
      where: { code: "CREDIT_CALCULATE" },
    });
    expect(creditCalc).toBeDefined();
    expect(creditCalc?.module).toBe("CREDIT");
  });

  it("should have correct role-permission assignments", async () => {
    const superAdmin = await db.role.findUnique({
      where: { code: "SUPER_ADMIN" },
      include: { rolePermissions: true },
    });
    expect(superAdmin?.rolePermissions.length).toBe(40);

    const marketing = await db.role.findUnique({
      where: { code: "MARKETING" },
      include: { rolePermissions: true },
    });
    // Marketing has 15 permissions (5 Auth/Profile, 3 Credit, 5 Simulation, 2 Report)
    expect(marketing?.rolePermissions.length).toBe(15);
  });

  it("should have BPR Kota Madiun and Products seeded", async () => {
    const bpr = await db.bpr.findUnique({
      where: { code: "BPR_KOTA_MADIUN" },
      include: { products: true, paymentOffices: true },
    });

    expect(bpr).toBeDefined();
    expect(bpr?.name).toBe("BPR Kota Madiun");
    expect(bpr?.products.length).toBeGreaterThan(0);
    expect(bpr?.paymentOffices.length).toBe(29);

    const product = bpr?.products.find((p) => p.code === "PLATINUM_MADIUN");
    expect(product).toBeDefined();
  });

  it("should have active CreditParameter with exact business rule rates", async () => {
    const product = await db.product.findFirst({
      where: { code: "PLATINUM_MADIUN" },
    });
    expect(product).toBeDefined();

    const param = await db.creditParameter.findFirst({
      where: { productId: product!.id, isActive: true },
    });

    expect(param).toBeDefined();
    expect(param?.flatAnnualRate.toString()).toBe("0.108");
    expect(param?.flatMonthlyRate.toString()).toBe("0.009");
    expect(param?.maximumDbr.toString()).toBe("0.9");
    expect(param?.maximumTenorMonths).toBe(120);
    expect(param?.maximumPrincipal.toString()).toBe("200000000");
    expect(param?.principalRoundingIncrement.toString()).toBe("100000");
    expect(param?.installmentDeductionPeriods).toBe(2);
  });

  it("should have active FeeParameter with exact standard fees", async () => {
    const product = await db.product.findFirst({
      where: { code: "PLATINUM_MADIUN" },
    });
    expect(product).toBeDefined();

    const fee = await db.feeParameter.findFirst({
      where: { productId: product!.id, isActive: true },
    });

    expect(fee).toBeDefined();
    expect(fee?.adminRate.toString()).toBe("0.005");
    expect(fee?.provisionRate.toString()).toBe("0.005");
    expect(fee?.verificationFee.toString()).toBe("1500000");
    expect(fee?.flaggingFee.toString()).toBe("38000"); // K-005: Rp38.000
    expect(fee?.frontingRate.toString()).toBe("0.06");
    expect(fee?.reserveRate.toString()).toBe("0.215");
  });

  it("should have 300 insurance rate rows with exact un-hallucinated values", async () => {
    const product = await db.product.findFirst({
      where: { code: "PLATINUM_MADIUN" },
    });
    expect(product).toBeDefined();

    const count = await db.insuranceRate.count({
      where: { productId: product!.id, isActive: true },
    });
    expect(count).toBe(300);

    // Check specific known cell values from reference Excel:
    // Age 65, Tenor 1 -> 0.0049
    const rate65_1 = await db.insuranceRate.findFirst({
      where: { productId: product!.id, age: 65, tenorYears: 1 },
    });
    expect(rate65_1?.premiumRate.toString()).toBe("0.0049");

    // Age 75, Tenor 1 -> 0.0488
    const rate75_1 = await db.insuranceRate.findFirst({
      where: { productId: product!.id, age: 75, tenorYears: 1 },
    });
    expect(rate75_1?.premiumRate.toString()).toBe("0.0488");
  });

  it("should have BusinessRuleVersion and ParameterVersion seeded", async () => {
    const brVersion = await db.businessRuleVersion.findUnique({
      where: { version: "BR-1.0" },
    });
    expect(brVersion).toBeDefined();
    expect(brVersion?.status).toBe("ACTIVE");

    const paramVersion = await db.parameterVersion.findFirst({
      where: { version: "v1.0" },
    });
    expect(paramVersion).toBeDefined();
    expect(paramVersion?.status).toBe("ACTIVE");
  });
});
