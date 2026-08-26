import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as getActiveCreditParameters } from "@/app/api/v1/products/[id]/credit-parameters/route";
import {
  GET as listParameterVersions,
  POST as createParameterVersion,
} from "@/app/api/v1/products/[id]/credit-parameters/versions/route";
import {
  UserRepository,
  BprRepository,
  ProductRepository,
} from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-022: Credit Parameter Versioning & Non-Overwriting Lifecycle", () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketingToken: string;

  let seededBprId: string;
  let testProductId: string;

  let otherBprId: string;
  let otherProductId: string;

  const testUserIds: string[] = [];
  const testBprIds: string[] = [];
  const testProductIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch Roles & Seeded BPR
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    const seededBpr = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });

    if (!saRole || !admRole || !mktRole || !seededBpr) {
      throw new Error("Required seed data not found");
    }

    seededBprId = seededBpr.id;

    // 2. Create isolated test product for BPR Kota Madiun
    const prodMadiun = await ProductRepository.create({
      bprId: seededBprId,
      code: `PROD_VER_${Date.now()}`,
      name: "Produk Versioning Test",
    });
    testProductId = prodMadiun.id;
    testProductIds.push(prodMadiun.id);

    // Seed initial v1 credit parameter for test product
    await db.creditParameter.create({
      data: {
        productId: testProductId,
        maximumAgeYears: 75,
        maximumAgeMonths: 0,
        maximumTenorMonths: 120,
        maximumPrincipal: 200000000,
        maximumDbr: 0.90,
        flatAnnualRate: 0.108,
        flatMonthlyRate: 0.009,
        principalRoundingIncrement: 100000,
        installmentDeductionPeriods: 2,
        effectiveFrom: new Date("2026-01-01"),
        version: "v1",
        isActive: true,
      },
    });

    // 3. Create another BPR and Product for scope validation
    const otherBpr = await BprRepository.create({
      code: `BPR_CP_SCOPE_${Date.now()}`,
      name: "BPR Scope Other",
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

    await db.creditParameter.create({
      data: {
        productId: otherProductId,
        maximumAgeYears: 70,
        maximumAgeMonths: 0,
        maximumTenorMonths: 60,
        maximumPrincipal: 100000000,
        maximumDbr: 0.80,
        flatAnnualRate: 0.12,
        flatMonthlyRate: 0.01,
        effectiveFrom: new Date("2026-01-01"),
        version: "v1",
        isActive: true,
      },
    });

    // 4. Create Test Users
    const sa = await UserRepository.create({
      username: `sa_cp_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin CP Test",
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
      username: `adm_cp_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin CP Madiun",
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
      username: `mkt_cp_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing CP Test",
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
      await db.creditParameter.deleteMany({ where: { productId: { in: testProductIds } } });
      await db.product.deleteMany({ where: { id: { in: testProductIds } } });
    }
    if (testBprIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testBprIds } } });
      await db.bpr.deleteMany({ where: { id: { in: testBprIds } } });
    }
  }, 45000);

  describe("GET /api/v1/products/:id/credit-parameters (Active Parameter Lookup)", () => {
    it("should return currently active credit parameters for authorized Super Admin", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/credit-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await getActiveCreditParameters(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.version).toBe("v1");
      expect(body.data.maximumDbr).toBe(0.9);
      expect(body.data.flatAnnualRate).toBe(0.108);
      expect(body.data.maximumTenorMonths).toBe(120);
      expect(body.data.maximumPrincipal).toBe(200000000);
      expect(body.data.isActive).toBe(true);
    }, 30000);

    it("should allow Admin to view active parameters of own BPR product", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/credit-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await getActiveCreditParameters(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.version).toBe("v1");
    }, 30000);

    it("SECURITY: should block Admin from viewing parameters of another BPR (403)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${otherProductId}/credit-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await getActiveCreditParameters(req, {
        params: { id: otherProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should reject Marketing with 403 Forbidden (no CREDIT_PARAMETER_VIEW)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/credit-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
        }
      );

      const res = await getActiveCreditParameters(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("POST /api/v1/products/:id/credit-parameters/versions (Create New Version)", () => {
    it("CRITICAL: should create v2 without overwriting historical v1, stamp effectiveTo, and record audit log", async () => {
      const effectiveDate = "2026-06-01";
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/credit-parameters/versions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            maximumAgeYears: 75,
            maximumTenorMonths: 144,
            maximumPrincipal: 250000000,
            maximumDbr: 0.90,
            flatAnnualRate: 0.115,
            principalRoundingIncrement: 100000,
            installmentDeductionPeriods: 2,
            effectiveFrom: effectiveDate,
            version: "v2",
            description: "Penyesuaian suku bunga tahun 2026 semester 2",
          }),
        }
      );

      const res = await createParameterVersion(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.version).toBe("v2");
      expect(body.data.flatAnnualRate).toBe(0.115);
      expect(body.data.maximumPrincipal).toBe(250000000);
      expect(body.data.isActive).toBe(true);

      // 1. Verify that previous v1 record STILL EXISTS in DB (Historical preservation)
      const allDbRecords = await db.creditParameter.findMany({
        where: { productId: testProductId },
        orderBy: { version: "asc" },
      });
      expect(allDbRecords.length).toBe(2);

      const v1Record = allDbRecords.find((r) => r.version === "v1");
      const v2Record = allDbRecords.find((r) => r.version === "v2");

      expect(v1Record).toBeDefined();
      expect(v1Record?.isActive).toBe(false); // deactivated
      expect(v1Record?.effectiveTo).not.toBeNull(); // stamped
      expect(Number(v1Record?.flatAnnualRate)).toBe(0.108); // preserved original un-mutated rate

      expect(v2Record).toBeDefined();
      expect(v2Record?.isActive).toBe(true);
      expect(Number(v2Record?.flatAnnualRate)).toBe(0.115);

      // 2. Verify Audit Log was recorded
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: v2Record?.id,
          action: "CREDIT_PARAMETER_CREATE",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);

      // 3. Verify that GET active parameter now returns v2
      const getActiveReq = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/credit-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );
      const activeRes = await getActiveCreditParameters(getActiveReq, {
        params: { id: testProductId },
      });
      const activeBody = await activeRes.json();
      expect(activeBody.data.version).toBe("v2");
      expect(activeBody.data.flatAnnualRate).toBe(0.115);
    }, 30000);

    it("should list all versions in GET /versions", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/credit-parameters/versions`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await listParameterVersions(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(2);
      expect(body.data[0].version).toBe("v2");
      expect(body.data[1].version).toBe("v1");
    }, 30000);

    it("SECURITY: should block Admin from creating parameter version for another BPR (403)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${otherProductId}/credit-parameters/versions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            maximumAgeYears: 70,
            maximumTenorMonths: 60,
            maximumPrincipal: 100000000,
            maximumDbr: 0.85,
            flatAnnualRate: 0.12,
            effectiveFrom: "2026-07-01",
          }),
        }
      );

      const res = await createParameterVersion(req, {
        params: { id: otherProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should reject invalid financial parameter bounds (400 Validation Error)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/credit-parameters/versions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            maximumAgeYears: 15, // invalid < 18
            maximumTenorMonths: 500, // invalid > 360
            maximumPrincipal: -5000, // invalid < 0
            maximumDbr: 2.5, // invalid > 1.0
            flatAnnualRate: 5.0, // invalid > 1.0
            effectiveFrom: "2026-01-01",
          }),
        }
      );

      const res = await createParameterVersion(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }, 30000);
  });
});
