import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as calculateCredit } from "@/app/api/v1/calculations/route";
import {
  UserRepository,
  BprRepository,
  ProductRepository,
} from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-035: POST /api/v1/calculations Integration & Orchestration Tests", { timeout: 30000 }, () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketingId: string;
  let unauthorizedUserId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketingToken: string;
  let unauthorizedToken: string;

  let seededBprId: string;
  let seededProductId: string;

  let otherBprId: string;
  let otherProductId: string;

  const testUserIds: string[] = [];
  const testBprIds: string[] = [];
  const testProductIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch Roles, Seeded BPR, and Seeded Product
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    const seededBpr = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    const seededProd = await db.product.findFirst({
      where: { code: "PLATINUM_MADIUN" },
    });

    if (!saRole || !admRole || !mktRole || !seededBpr || !seededProd) {
      throw new Error("Required seed data not found");
    }

    seededBprId = seededBpr.id;
    seededProductId = seededProd.id;

    // 2. Create another BPR and Product to test scope isolation
    const otherBpr = await BprRepository.create({
      code: `BPR_CALC_SCOPE_${Date.now()}`,
      name: "BPR Calculation Scope Other",
    });
    otherBprId = otherBpr.id;
    testBprIds.push(otherBpr.id);

    const otherProd = await ProductRepository.create({
      bprId: otherBprId,
      code: `PROD_OTHER_${Date.now()}`,
      name: "Produk Other BPR",
    });
    otherProductId = otherProd.id;
    testProductIds.push(otherProd.id);

    // 3. Create test users
    const saUser = await UserRepository.create({
      username: `sa_calc_${Date.now()}`,
      fullName: "Super Admin Calc Test",
      roleId: saRole.id,
      password: "SuperAdminPassword123!",
    });
    superAdminId = saUser.id;
    testUserIds.push(saUser.id);
    superAdminToken = await signSessionToken({
      userId: saUser.id,
      username: saUser.username,
      fullName: saUser.fullName,
      role: saRole.code,
    });

    const admUser = await UserRepository.create({
      username: `adm_calc_${Date.now()}`,
      fullName: "Admin Madiun Calc Test",
      roleId: admRole.id,
      bprId: seededBprId,
      password: "AdminMadiunPassword123!",
    });
    adminMadiunId = admUser.id;
    testUserIds.push(admUser.id);
    adminMadiunToken = await signSessionToken({
      userId: admUser.id,
      username: admUser.username,
      fullName: admUser.fullName,
      role: admRole.code,
      bprId: seededBprId,
    });

    const mktUser = await UserRepository.create({
      username: `mkt_calc_${Date.now()}`,
      fullName: "Marketing Calc Test",
      roleId: mktRole.id,
      bprId: seededBprId,
      password: "MarketingPassword123!",
    });
    marketingId = mktUser.id;
    testUserIds.push(mktUser.id);
    marketingToken = await signSessionToken({
      userId: mktUser.id,
      username: mktUser.username,
      fullName: mktUser.fullName,
      role: mktRole.code,
      bprId: seededBprId,
    });

    // Create a role without CREDIT_CALCULATE
    const unauthRole = await db.role.create({
      data: {
        code: `NO_CALC_ROLE_${Date.now()}`,
        name: "No Calc Role",
      },
    });

    const unauthUser = await UserRepository.create({
      username: `unauth_calc_${Date.now()}`,
      fullName: "Unauthorized User",
      roleId: unauthRole.id,
      password: "UnauthorizedPassword123!",
    });
    unauthorizedUserId = unauthUser.id;
    testUserIds.push(unauthUser.id);
    unauthorizedToken = await signSessionToken({
      userId: unauthUser.id,
      username: unauthUser.username,
      fullName: unauthUser.fullName,
      role: unauthRole.code,
    });
  }, 45000);

  afterAll(async () => {
    // Cleanup created test records
    for (const pId of testProductIds) {
      await db.product.deleteMany({ where: { id: pId } });
    }
    for (const uId of testUserIds) {
      await db.user.deleteMany({ where: { id: uId } });
    }
    for (const bId of testBprIds) {
      await db.bpr.deleteMany({ where: { id: bId } });
    }
  });

  const createRequest = (body: unknown, token?: string) => {
    return new NextRequest("http://localhost:3000/api/v1/calculations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  };

  describe("Authentication & Authorization", () => {
    it("should reject unauthenticated request with 401", async () => {
      const req = createRequest({
        productId: seededProductId,
        birthDate: "1970-01-01",
        netSalary: 10000000,
        requestedPrincipal: 100000000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
      });

      const res = await calculateCredit(req);
      expect(res.status).toBe(401);
    });

    it("should reject user without CREDIT_CALCULATE permission with 403", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1970-01-01",
          netSalary: 10000000,
          requestedPrincipal: 100000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
        },
        unauthorizedToken
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(403);
    });

    it("should prevent cross-tenant calculation for BPR-restricted user with 403", async () => {
      const req = createRequest(
        {
          productId: otherProductId, // belongs to other BPR
          birthDate: "1970-01-01",
          netSalary: 10000000,
          requestedPrincipal: 100000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
        },
        marketingToken // restricted to seededBprId
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(403);
    });
  });

  describe("End-to-End FLAT Calculation", () => {
    it("should successfully calculate credit and return full breakdown and schedule", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1961-01-01", // Age 65 in 2026
          netSalary: 8500000,
          requestedPrincipal: 100000000, // 100M
          tenorMonths: 60, // 5 years
          calculationMethod: "FLAT",
        },
        marketingToken
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.calculationNumber).toMatch(/^CALC-\d+-\d+$/);
      expect(json.data.status).toBe("OK");
      expect(json.data.isEligible).toBe(true);
      expect(json.data.calculationMethod).toBe("FLAT");

      // Result checks
      expect(json.data.result.installment).toBeGreaterThan(0);
      expect(json.data.result.dbr).toBeLessThanOrEqual(0.90);
      expect(json.data.result.netDisbursement).toBeGreaterThan(0);

      // Breakdown checks
      expect(json.data.breakdown.age.currentYears).toBe(65);
      expect(json.data.breakdown.tenor.insuranceYears).toBe(5);

      // Insurance checks
      expect(json.data.insurance.rate).toBeGreaterThan(0);
      expect(json.data.insurance.premium).toBeGreaterThan(0);
      expect(json.data.insurance.fronting).toBeGreaterThan(0);
      expect(json.data.insurance.reserve).toBeGreaterThan(0);

      // Fees checks
      expect(json.data.fees.verification).toBe(1500000);
      expect(json.data.fees.flagging).toBe(38000);

      // Amortization Schedule checks
      expect(json.data.schedule.length).toBe(60);
      expect(json.data.schedule[59].closingBalance).toBe(0);

      // Audit Log check
      const audit = await db.auditLog.findFirst({
        where: {
          action: "CREDIT_CALCULATE",
          userId: marketingId,
        },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe("End-to-End ANNUITY Calculation", () => {
    it("should successfully calculate credit using ANNUITY / PMT method", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1961-01-01",
          netSalary: 10000000,
          requestedPrincipal: 100000000,
          tenorMonths: 36,
          calculationMethod: "ANNUITY",
        },
        marketingToken
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.calculationMethod).toBe("ANNUITY");
      expect(json.data.status).toBe("OK");
      expect(json.data.schedule.length).toBe(36);
      expect(json.data.schedule[35].closingBalance).toBe(0);
    });
  });

  describe("Calculation Validation & Error Responses", () => {
    it("should return 422 for invalid debtor age (> 85 years)", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1930-01-01", // Age 96 > 85
          netSalary: 10000000,
          requestedPrincipal: 100000000,
          tenorMonths: 12,
          calculationMethod: "FLAT",
        },
        marketingToken
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error.code).toBe("CALCULATION_VALIDATION_ERROR");
      expect(json.error.details.birthDate).toBeDefined();
    });

    it("should return 422 for negative or zero principal", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1970-01-01",
          netSalary: 10000000,
          requestedPrincipal: 0, // Invalid
          tenorMonths: 12,
          calculationMethod: "FLAT",
        },
        marketingToken
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error.code).toBe("CALCULATION_VALIDATION_ERROR");
    });
  });
});
