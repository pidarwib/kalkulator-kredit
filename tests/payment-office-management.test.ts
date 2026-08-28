import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as listPaymentOffices,
  POST as createPaymentOffice,
} from "@/app/api/v1/payment-offices/route";
import {
  GET as getPaymentOfficeById,
  PATCH as updatePaymentOfficeById,
  DELETE as deletePaymentOfficeById,
} from "@/app/api/v1/payment-offices/[id]/route";
import {
  UserRepository,
  BranchRepository,
  BprRepository,
  PaymentOfficeRepository,
} from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-020: Payment Office Management API & BPR->Branch Hierarchy Validation", () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketingToken: string;

  let seededBprId: string;
  let branchMadiunId: string;

  let otherBprId: string;
  let otherBranchId: string;

  const testUserIds: string[] = [];
  const testBranchIds: string[] = [];
  const testBprIds: string[] = [];
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

    // 2. Create Branch under Seeded BPR
    const bMadiun = await BranchRepository.create({
      bprId: seededBprId,
      code: `BR_PO_MDN_${Date.now()}`,
      name: "Cabang Payment Office Madiun",
    });
    branchMadiunId = bMadiun.id;
    testBranchIds.push(bMadiun.id);

    // 3. Create another BPR and Branch for cross-hierarchy testing
    const otherBpr = await BprRepository.create({
      code: `BPR_CROSS_${Date.now()}`,
      name: "BPR Cross Test",
    });
    otherBprId = otherBpr.id;
    testBprIds.push(otherBpr.id);

    const otherBranch = await BranchRepository.create({
      bprId: otherBprId,
      code: `BR_CROSS_${Date.now()}`,
      name: "Cabang Cross Region",
    });
    otherBranchId = otherBranch.id;
    testBranchIds.push(otherBranch.id);

    // 4. Create Test Users
    const sa = await UserRepository.create({
      username: `sa_po_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin PO Test",
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
      username: `adm_po_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin PO Madiun",
      roleId: admRole.id,
      bprId: seededBprId,
      branchId: branchMadiunId,
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
      branchId: branchMadiunId,
    });

    const mkt = await UserRepository.create({
      username: `mkt_po_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing PO Test",
      roleId: mktRole.id,
      bprId: seededBprId,
      branchId: branchMadiunId,
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
      branchId: branchMadiunId,
    });
  }, 45000);

  afterAll(async () => {
    if (testUserIds.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: testUserIds } } });
      await db.auditLog.deleteMany({ where: { entityId: { in: testUserIds } } });
      await db.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
    if (testOfficeIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testOfficeIds } } });
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

  describe("GET /api/v1/payment-offices (List Payment Offices)", () => {
    it("should list payment offices with pagination for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payment-offices", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await listPaymentOffices(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
    }, 30000);

    it("should filter payment offices by bprId and branchId", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/payment-offices?bprId=${seededBprId}&branchId=${branchMadiunId}`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await listPaymentOffices(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      for (const po of body.data) {
        expect(po.bprId).toBe(seededBprId);
        expect(po.branchId).toBe(branchMadiunId);
      }
    }, 30000);

    it("should restrict Admin to their assigned BPR", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payment-offices", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await listPaymentOffices(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      for (const po of body.data) {
        expect(po.bprId).toBe(seededBprId);
      }
    }, 30000);

    it("should allow Marketing to list Payment Offices scoped to their BPR (for credit calculations)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payment-offices", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const res = await listPaymentOffices(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      for (const po of body.data) {
        expect(po.bprId).toBe(seededBprId);
      }
    }, 30000);

    it("should reject unauthenticated request with 401 Unauthorized", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payment-offices", {
        method: "GET",
      });

      const res = await listPaymentOffices(req);
      expect(res.status).toBe(401);
    }, 30000);
  });

  describe("POST /api/v1/payment-offices (Create Payment Office)", () => {
    let createdOfficeId: string;

    it("should allow Super Admin to create a valid Payment Office + record audit log", async () => {
      const poCode = `POS_TEST_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/payment-offices", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: seededBprId,
          branchId: branchMadiunId,
          code: poCode,
          name: "Kantor Pos Pembantu Pasar Madiun",
          type: "POS",
        }),
      });

      const res = await createPaymentOffice(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.code).toBe(poCode);
      expect(body.data.bprId).toBe(seededBprId);
      expect(body.data.branchId).toBe(branchMadiunId);
      createdOfficeId = body.data.id;
      testOfficeIds.push(createdOfficeId);

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: createdOfficeId,
          action: "PAYMENT_OFFICE_CREATE",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);
    }, 30000);

    it("HIERARCHY VALIDATION: should reject when Branch belongs to a different BPR (400)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payment-offices", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: seededBprId, // BPR Kota Madiun
          branchId: otherBranchId, // Branch belonging to BPR Cross Test!
          code: "INVALID_HIERARCHY_PO",
          name: "Invalid Hierarchy Office",
        }),
      });

      const res = await createPaymentOffice(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("INVALID_RELATIONSHIP");
    }, 30000);

    it("SECURITY: should block Admin from creating Payment Office in another BPR (403)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payment-offices", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: otherBprId,
          branchId: otherBranchId,
          code: "ILLEGAL_PO",
          name: "Illegal Payment Office",
        }),
      });

      const res = await createPaymentOffice(req);
      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("GET /api/v1/payment-offices/:id (Get Single Payment Office)", () => {
    let officeId: string;

    beforeAll(async () => {
      const office = await PaymentOfficeRepository.create({
        bprId: seededBprId,
        branchId: branchMadiunId,
        code: `PO_GET_${Date.now()}`,
        name: "Payment Office for Single Get",
      });
      officeId = office.id;
      testOfficeIds.push(office.id);
    }, 30000);

    it("should return payment office details with BPR and Branch relations", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/payment-offices/${officeId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await getPaymentOfficeById(req, {
        params: { id: officeId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(officeId);
      expect(body.data.bpr).toBeDefined();
      expect(body.data.branch).toBeDefined();
    }, 30000);

    it("should return 404 for non-existent payment office", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const req = new NextRequest(`http://localhost:3000/api/v1/payment-offices/${fakeId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getPaymentOfficeById(req, {
        params: { id: fakeId },
      });

      expect(res.status).toBe(404);
    }, 30000);
  });

  describe("PATCH /api/v1/payment-offices/:id (Update Payment Office)", () => {
    let officeToUpdateId: string;

    beforeAll(async () => {
      const office = await PaymentOfficeRepository.create({
        bprId: seededBprId,
        branchId: branchMadiunId,
        code: `UPD_PO_${Date.now()}`,
        name: "Office To Update",
      });
      officeToUpdateId = office.id;
      testOfficeIds.push(office.id);
    }, 30000);

    it("should update payment office name & status + record audit log", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/payment-offices/${officeToUpdateId}`,
        {
          method: "PATCH",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name: "Updated Payment Office Name",
            type: "BANK",
          }),
        }
      );

      const res = await updatePaymentOfficeById(req, {
        params: { id: officeToUpdateId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Updated Payment Office Name");
      expect(body.data.type).toBe("BANK");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: officeToUpdateId,
          action: "PAYMENT_OFFICE_UPDATE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);

    it("HIERARCHY VALIDATION: should reject updating branch to an unaffiliated branch", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/payment-offices/${officeToUpdateId}`,
        {
          method: "PATCH",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            branchId: otherBranchId, // from BPR Cross Test!
          }),
        }
      );

      const res = await updatePaymentOfficeById(req, {
        params: { id: officeToUpdateId },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_RELATIONSHIP");
    }, 30000);
  });

  describe("DELETE /api/v1/payment-offices/:id (Soft Delete Payment Office)", () => {
    let officeToDeleteId: string;

    beforeAll(async () => {
      const office = await PaymentOfficeRepository.create({
        bprId: seededBprId,
        branchId: branchMadiunId,
        code: `DEL_PO_${Date.now()}`,
        name: "Office To Delete",
      });
      officeToDeleteId = office.id;
      testOfficeIds.push(office.id);
    }, 30000);

    it("should soft delete payment office + record audit log (204 No Content)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/payment-offices/${officeToDeleteId}`,
        {
          method: "DELETE",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await deletePaymentOfficeById(req, {
        params: { id: officeToDeleteId },
      });

      expect(res.status).toBe(204);

      // Verify soft delete in DB
      const dbOffice = await db.paymentOffice.findUnique({
        where: { id: officeToDeleteId },
      });
      expect(dbOffice).not.toBeNull();
      expect(dbOffice?.deletedAt).not.toBeNull();
      expect(dbOffice?.status).toBe("INACTIVE");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: officeToDeleteId,
          action: "PAYMENT_OFFICE_DELETE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);
  });
});
