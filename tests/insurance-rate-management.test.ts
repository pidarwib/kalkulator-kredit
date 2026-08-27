import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listInsuranceRates } from "@/app/api/v1/products/[id]/insurance-rates/route";
import { GET as lookupInsuranceRate } from "@/app/api/v1/products/[id]/insurance-rates/lookup/route";
import { POST as importInsuranceRates } from "@/app/api/v1/products/[id]/insurance-rates/import/route";
import {
  UserRepository,
  BprRepository,
  ProductRepository,
  InsuranceRateRepository,
} from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-024: Insurance Rate Management API, Strict Lookup & Versioning", () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketingToken: string;

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
      code: `BPR_INS_SCOPE_${Date.now()}`,
      name: "BPR Insurance Scope Other",
    });
    otherBprId = otherBpr.id;
    testBprIds.push(otherBpr.id);

    const otherProd = await ProductRepository.create({
      bprId: otherBprId,
      code: `PROD_INS_OTH_${Date.now()}`,
      name: "Produk Insurance Other BPR",
    });
    otherProductId = otherProd.id;
    testProductIds.push(otherProd.id);

    // Add minimal test insurance rates for other product
    await InsuranceRateRepository.createVersion({
      productId: otherProductId,
      rates: [
        { age: 50, tenorYears: 1, premiumRate: 0.005 },
        { age: 50, tenorYears: 2, premiumRate: 0.009 },
      ],
      version: "v1",
      description: "Initial test rates other BPR",
    });

    // 3. Create Test Users
    const sa = await UserRepository.create({
      username: `sa_ins_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin Insurance Test",
      roleId: saRole.id,
      status: "ACTIVE",
    });
    superAdminId = sa.id;
    testUserIds.push(sa.id);
    superAdminToken = await signSessionToken({
      userId: sa.id,
      username: sa.username,
      fullName: sa.fullName,
      role: "SUPER_ADMIN",
    });

    const admMadiun = await UserRepository.create({
      username: `adm_ins_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin Insurance Madiun",
      roleId: admRole.id,
      bprId: seededBprId,
      status: "ACTIVE",
    });
    adminMadiunId = admMadiun.id;
    testUserIds.push(admMadiun.id);
    adminMadiunToken = await signSessionToken({
      userId: admMadiun.id,
      username: admMadiun.username,
      fullName: admMadiun.fullName,
      role: "ADMIN",
      bprId: seededBprId,
    });

    const mkt = await UserRepository.create({
      username: `mkt_ins_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing Insurance Test",
      roleId: mktRole.id,
      bprId: seededBprId,
      status: "ACTIVE",
    });
    marketingId = mkt.id;
    testUserIds.push(mkt.id);
    marketingToken = await signSessionToken({
      userId: mkt.id,
      username: mkt.username,
      fullName: mkt.fullName,
      role: "MARKETING",
      bprId: seededBprId,
    });
  }, 45000);

  afterAll(async () => {
    if (testUserIds.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: testUserIds } } });
      await db.auditLog.deleteMany({ where: { entityId: { in: testUserIds } } });
      await db.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
    if (testProductIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testProductIds } } });
      await db.parameterVersion.deleteMany({ where: { productId: { in: testProductIds } } });
      await db.insuranceRate.deleteMany({ where: { productId: { in: testProductIds } } });
      await db.product.deleteMany({ where: { id: { in: testProductIds } } });
    }
    if (testBprIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testBprIds } } });
      await db.bpr.deleteMany({ where: { id: { in: testBprIds } } });
    }
  }, 45000);

  describe("GET /api/v1/products/:id/insurance-rates (List Rates)", () => {
    it("should list seeded insurance rates with pagination for Super Admin", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${seededProductId}/insurance-rates?page=1&pageSize=50`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await listInsuranceRates(req, {
        params: { id: seededProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(50);
      expect(body.meta.total).toBe(300);
    }, 30000);

    it("should filter insurance rates by age and tenor", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${seededProductId}/insurance-rates?age=65&tenorYears=1`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await listInsuranceRates(req, {
        params: { id: seededProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].age).toBe(65);
      expect(body.data[0].tenorYears).toBe(1);
      expect(body.data[0].premiumRate).toBe(0.0049); // exact un-hallucinated value from Excel
    }, 30000);

    it("should allow Admin to list insurance rates of own BPR product", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${seededProductId}/insurance-rates`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await listInsuranceRates(req, {
        params: { id: seededProductId },
      });

      expect(res.status).toBe(200);
    }, 30000);

    it("SECURITY: should block Admin from viewing rates of another BPR (403)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${otherProductId}/insurance-rates`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await listInsuranceRates(req, {
        params: { id: otherProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should reject Marketing with 403 Forbidden", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${seededProductId}/insurance-rates`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
        }
      );

      const res = await listInsuranceRates(req, {
        params: { id: seededProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("GET /api/v1/products/:id/insurance-rates/lookup (Exact & Dual Lookup)", () => {
    it("should return exact rate from reference table for age 65 tenor 1", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${seededProductId}/insurance-rates/lookup?age=65&tenorYears=1`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await lookupInsuranceRate(req, {
        params: { id: seededProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.age).toBe(65);
      expect(body.data.tenorYears).toBe(1);
      expect(body.data.premiumRate).toBe(0.0049);
    }, 30000);

    it("BUSINESS RULE (Section 25): should perform dual lookup and return MAX(age, age+1)", async () => {
      // Age 65 tenor 1 vs Age 66 tenor 1
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${seededProductId}/insurance-rates/lookup?age=65&tenorYears=1&dualLookup=true`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await lookupInsuranceRate(req, {
        params: { id: seededProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.currentAge).toBe(65);
      expect(typeof body.data.currentAgeRate).toBe("number");
      expect(typeof body.data.nextAgeRate).toBe("number");
      expect(body.data.selectedRate).toBeGreaterThanOrEqual(body.data.currentAgeRate);
      expect(body.data.selectedRate).toBe(Math.max(body.data.currentAgeRate, body.data.nextAgeRate));
    }, 30000);

    it("CRITICAL RULE: Missing rate must return 404 NOT_FOUND error (NO AI estimation/guessing)", async () => {
      // Out of bounds age / tenor
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${seededProductId}/insurance-rates/lookup?age=99&tenorYears=25`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await lookupInsuranceRate(req, {
        params: { id: seededProductId },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    }, 30000);
  });

  describe("POST /api/v1/products/:id/insurance-rates/import (Versioned Batch Import)", () => {
    let testImportProductId: string;

    beforeAll(async () => {
      const prod = await ProductRepository.create({
        bprId: seededBprId,
        code: `PROD_IMP_${Date.now()}`,
        name: "Produk Import Test",
      });
      testImportProductId = prod.id;
      testProductIds.push(prod.id);

      // Seed initial v1
      await InsuranceRateRepository.createVersion({
        productId: testImportProductId,
        rates: [
          { age: 60, tenorYears: 1, premiumRate: 0.0035 },
          { age: 60, tenorYears: 2, premiumRate: 0.0068 },
        ],
        version: "v1",
      });
    }, 30000);

    it("CRITICAL: should import v2 without overwriting historical v1 and record audit log", async () => {
      const effectiveDate = "2026-08-01";
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testImportProductId}/insurance-rates/import`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            rates: [
              { age: 60, tenorYears: 1, premiumRate: 0.004 },
              { age: 60, tenorYears: 2, premiumRate: 0.0075 },
              { age: 61, tenorYears: 1, premiumRate: 0.0045 },
            ],
            version: "v2",
            effectiveFrom: effectiveDate,
            description: "Penyesuaian tabel mortalita asuransi 2026",
          }),
        }
      );

      const res = await importInsuranceRates(req, {
        params: { id: testImportProductId },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.version).toBe("v2");
      expect(body.data.importedCount).toBe(3);

      // 1. Verify historical preservation in database
      const v1Rates = await db.insuranceRate.findMany({
        where: { productId: testImportProductId, version: "v1" },
      });
      expect(v1Rates.length).toBe(2);
      expect(v1Rates[0].isActive).toBe(false);
      expect(v1Rates[0].effectiveTo).not.toBeNull();

      const v2Rates = await db.insuranceRate.findMany({
        where: { productId: testImportProductId, version: "v2" },
      });
      expect(v2Rates.length).toBe(3);
      expect(v2Rates[0].isActive).toBe(true);

      // 2. Verify audit log was recorded
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: testImportProductId,
          action: "INSURANCE_RATE_IMPORT",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);

      // 3. Verify active lookup now returns v2 value (0.004)
      const lookup = await InsuranceRateRepository.lookup(
        testImportProductId,
        60,
        1
      );
      expect(lookup?.version).toBe("v2");
      expect(Number(lookup?.premiumRate)).toBe(0.004);
    }, 30000);

    it("should reject payload with duplicate age and tenor entries (400)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testImportProductId}/insurance-rates/import`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            rates: [
              { age: 55, tenorYears: 1, premiumRate: 0.002 },
              { age: 55, tenorYears: 1, premiumRate: 0.0025 }, // Duplicate age 55 tenor 1!
            ],
          }),
        }
      );

      const res = await importInsuranceRates(req, {
        params: { id: testImportProductId },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }, 30000);

    it("SECURITY: should block Admin from importing rates for another BPR (403)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${otherProductId}/insurance-rates/import`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            rates: [{ age: 50, tenorYears: 1, premiumRate: 0.005 }],
          }),
        }
      );

      const res = await importInsuranceRates(req, {
        params: { id: otherProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);
  });
});
