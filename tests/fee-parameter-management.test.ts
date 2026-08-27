import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as getActiveFeeParameters } from "@/app/api/v1/products/[id]/fee-parameters/route";
import {
  GET as listFeeParameterVersions,
  POST as createFeeParameterVersion,
} from "@/app/api/v1/products/[id]/fee-parameters/versions/route";
import {
  UserRepository,
  BprRepository,
  BranchRepository,
  PaymentOfficeRepository,
  ProductRepository,
} from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-023: Fee Parameter Management API & Versioning Lifecycle", () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketingToken: string;

  let seededBprId: string;
  let testProductId: string;
  let testBranchId: string;
  let testPaymentOfficeId: string;

  let otherBprId: string;
  let otherProductId: string;
  let otherPaymentOfficeId: string;

  const testUserIds: string[] = [];
  const testBprIds: string[] = [];
  const testProductIds: string[] = [];
  const testBranchIds: string[] = [];
  const testOfficeIds: string[] = [];

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
      code: `PROD_FEE_${Date.now()}`,
      name: "Produk Fee Versioning Test",
    });
    testProductId = prodMadiun.id;
    testProductIds.push(prodMadiun.id);

    // Create Branch & Payment Office for BPR Kota Madiun
    const brMadiun = await BranchRepository.create({
      bprId: seededBprId,
      code: `BR_FEE_MDN_${Date.now()}`,
      name: "Cabang Fee Madiun",
    });
    testBranchId = brMadiun.id;
    testBranchIds.push(brMadiun.id);

    const poMadiun = await PaymentOfficeRepository.create({
      bprId: seededBprId,
      branchId: testBranchId,
      code: `PO_FEE_MDN_${Date.now()}`,
      name: "Kantor Pos Madiun Fee Test",
    });
    testPaymentOfficeId = poMadiun.id;
    testOfficeIds.push(poMadiun.id);

    // Seed initial v1 fee parameter for test product
    await db.feeParameter.create({
      data: {
        productId: testProductId,
        paymentOfficeId: null,
        adminRate: 0,
        provisionRate: 0,
        verificationFee: 1500000,
        flaggingFee: 38000,
        frontingRate: 0,
        reserveRate: 0,
        effectiveFrom: new Date("2026-01-01"),
        version: "v1",
        isActive: true,
      },
    });

    // 3. Create another BPR, Product, and Payment Office for cross-hierarchy tests
    const otherBpr = await BprRepository.create({
      code: `BPR_FEE_SCOPE_${Date.now()}`,
      name: "BPR Fee Scope Other",
    });
    otherBprId = otherBpr.id;
    testBprIds.push(otherBpr.id);

    const otherProd = await ProductRepository.create({
      bprId: otherBprId,
      code: `PROD_FEE_OTH_${Date.now()}`,
      name: "Produk Fee Other BPR",
    });
    otherProductId = otherProd.id;
    testProductIds.push(otherProd.id);

    const otherOffice = await PaymentOfficeRepository.create({
      bprId: otherBprId,
      code: `PO_FEE_OTH_${Date.now()}`,
      name: "Kantor Pos Other BPR",
    });
    otherPaymentOfficeId = otherOffice.id;
    testOfficeIds.push(otherOffice.id);

    await db.feeParameter.create({
      data: {
        productId: otherProductId,
        paymentOfficeId: null,
        adminRate: 0.01,
        provisionRate: 0.01,
        verificationFee: 1000000,
        flaggingFee: 35000,
        effectiveFrom: new Date("2026-01-01"),
        version: "v1",
        isActive: true,
      },
    });

    // 4. Create Test Users
    const sa = await UserRepository.create({
      username: `sa_fee_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin Fee Test",
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
      username: `adm_fee_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin Fee Madiun",
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
      username: `mkt_fee_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing Fee Test",
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
      await db.feeParameter.deleteMany({ where: { productId: { in: testProductIds } } });
      await db.product.deleteMany({ where: { id: { in: testProductIds } } });
    }
    if (testOfficeIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testOfficeIds } } });
      await db.feeParameter.deleteMany({ where: { paymentOfficeId: { in: testOfficeIds } } });
      await db.paymentOffice.deleteMany({ where: { id: { in: testOfficeIds } } });
    }
    if (testBranchIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testBranchIds } } });
      await db.branch.deleteMany({ where: { id: { in: testBranchIds } } });
    }
    if (testBprIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testBprIds } } });
      await db.bpr.deleteMany({ where: { id: { in: testBprIds } } });
    }
  }, 45000);

  describe("GET /api/v1/products/:id/fee-parameters (Active Parameter Lookup)", () => {
    it("should return currently active fee parameter for Super Admin", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await getActiveFeeParameters(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.version).toBe("v1");
      expect(body.data.verificationFee).toBe(1500000);
      expect(body.data.flaggingFee).toBe(38000);
      expect(body.data.isActive).toBe(true);
    }, 30000);

    it("should allow Admin to view active fee parameters of own BPR product", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await getActiveFeeParameters(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.version).toBe("v1");
    }, 30000);

    it("SECURITY: should block Admin from viewing fee parameters of another BPR (403)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${otherProductId}/fee-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await getActiveFeeParameters(req, {
        params: { id: otherProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should reject Marketing with 403 Forbidden (no CREDIT_PARAMETER_VIEW)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
        }
      );

      const res = await getActiveFeeParameters(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("POST /api/v1/products/:id/fee-parameters/versions (Create New Fee Version)", () => {
    it("CRITICAL: should create v2 without overwriting historical v1, stamp effectiveTo, and record audit log", async () => {
      const effectiveDate = "2026-07-01";
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters/versions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            adminRate: 0.015,
            provisionRate: 0.01,
            verificationFee: 2000000,
            flaggingFee: 40000,
            frontingRate: 0.005,
            reserveRate: 0.005,
            effectiveFrom: effectiveDate,
            version: "v2",
            description: "Penyesuaian biaya verifikasi & provisi Q3 2026",
          }),
        }
      );

      const res = await createFeeParameterVersion(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.version).toBe("v2");
      expect(body.data.adminRate).toBe(0.015);
      expect(body.data.verificationFee).toBe(2000000);
      expect(body.data.flaggingFee).toBe(40000);
      expect(body.data.isActive).toBe(true);

      // 1. Verify previous v1 record STILL EXISTS in DB (Non-overwriting rule)
      const allDbRecords = await db.feeParameter.findMany({
        where: { productId: testProductId, paymentOfficeId: null },
        orderBy: { version: "asc" },
      });
      expect(allDbRecords.length).toBe(2);

      const v1Record = allDbRecords.find((r) => r.version === "v1");
      const v2Record = allDbRecords.find((r) => r.version === "v2");

      expect(v1Record).toBeDefined();
      expect(v1Record?.isActive).toBe(false); // deactivated
      expect(v1Record?.effectiveTo).not.toBeNull(); // stamped
      expect(Number(v1Record?.verificationFee)).toBe(1500000); // original value preserved

      expect(v2Record).toBeDefined();
      expect(v2Record?.isActive).toBe(true);
      expect(Number(v2Record?.verificationFee)).toBe(2000000);

      // 2. Verify Audit Log was recorded
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: v2Record?.id,
          action: "FEE_PARAMETER_CREATE",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);

      // 3. Verify GET active parameter now returns v2
      const getActiveReq = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );
      const activeRes = await getActiveFeeParameters(getActiveReq, {
        params: { id: testProductId },
      });
      const activeBody = await activeRes.json();
      expect(activeBody.data.version).toBe("v2");
      expect(activeBody.data.verificationFee).toBe(2000000);
    }, 30000);

    it("HIERARCHY VALIDATION: should reject creating fee parameter with paymentOffice from another BPR (400)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters/versions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            paymentOfficeId: otherPaymentOfficeId, // Office belonging to other BPR!
            adminRate: 0.02,
            effectiveFrom: "2026-08-01",
          }),
        }
      );

      const res = await createFeeParameterVersion(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_RELATIONSHIP");
    }, 30000);

    it("should allow creating payment-office specific fee parameter override", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters/versions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            paymentOfficeId: testPaymentOfficeId,
            adminRate: 0.005,
            provisionRate: 0.005,
            verificationFee: 1200000,
            flaggingFee: 38000,
            effectiveFrom: "2026-08-01",
            version: "v1-pos",
            description: "Tarif khusus Kantor Pos Madiun",
          }),
        }
      );

      const res = await createFeeParameterVersion(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.paymentOfficeId).toBe(testPaymentOfficeId);
      expect(body.data.verificationFee).toBe(1200000);

      // Verify specific lookup with query ?paymentOfficeId
      const lookupReq = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters?paymentOfficeId=${testPaymentOfficeId}`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );
      const lookupRes = await getActiveFeeParameters(lookupReq, {
        params: { id: testProductId },
      });
      const lookupBody = await lookupRes.json();
      expect(lookupBody.data.verificationFee).toBe(1200000);
      expect(lookupBody.data.paymentOfficeId).toBe(testPaymentOfficeId);
    }, 30000);

    it("should list all versions in GET /versions", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${testProductId}/fee-parameters/versions`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await listFeeParameterVersions(req, {
        params: { id: testProductId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it("SECURITY: should block Admin from creating fee version for another BPR (403)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/products/${otherProductId}/fee-parameters/versions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            adminRate: 0.02,
            effectiveFrom: "2026-09-01",
          }),
        }
      );

      const res = await createFeeParameterVersion(req, {
        params: { id: otherProductId },
      });

      expect(res.status).toBe(403);
    }, 30000);
  });
});
