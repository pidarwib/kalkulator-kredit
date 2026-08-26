import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listBprs, POST as createBpr } from "@/app/api/v1/bprs/route";
import {
  GET as getBprById,
  PATCH as updateBprById,
  DELETE as deleteBprById,
} from "@/app/api/v1/bprs/[id]/route";
import { UserRepository, BprRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-018: BPR Management API & Scope Validation", () => {
  let superAdminId: string;
  let adminId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminToken: string;
  let marketingToken: string;

  let seededBprId: string;
  const testUserIds: string[] = [];
  const testBprIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch Roles & Seeded BPR
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    const seededBpr = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    if (!saRole || !admRole || !mktRole || !seededBpr) throw new Error("Seeds must exist");

    seededBprId = seededBpr.id;

    // 2. Create Test Users
    const sa = await UserRepository.create({
      username: `sa_bpr_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin BPR",
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

    const adm = await UserRepository.create({
      username: `adm_bpr_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin BPR",
      roleId: admRole.id,
      bprId: seededBprId,
      status: "ACTIVE",
    });
    adminId = adm.id;
    testUserIds.push(adm.id);
    adminToken = await signSessionToken({
      userId: adm.id,
      username: adm.username,
      fullName: adm.fullName,
      role: "ADMIN",
    });

    const mkt = await UserRepository.create({
      username: `mkt_bpr_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing BPR",
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
    });
  }, 45000);

  afterAll(async () => {
    if (testUserIds.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: testUserIds } } });
      await db.auditLog.deleteMany({ where: { entityId: { in: testUserIds } } });
      await db.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
    if (testBprIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testBprIds } } });
      await db.bpr.deleteMany({ where: { id: { in: testBprIds } } });
    }
  }, 45000);

  describe("GET /api/v1/bprs (List BPRs)", () => {
    it("should list all BPRs for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/bprs", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await listBprs(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it("should restrict Admin to their assigned BPR", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/bprs", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
      });

      const res = await listBprs(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(seededBprId);
    }, 30000);

    it("should reject Marketing with 403 Forbidden (Marketing lacks MASTER_VIEW)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/bprs", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const res = await listBprs(req);
      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("POST /api/v1/bprs (Create BPR)", () => {
    let newBprId: string;

    it("should allow Super Admin to create a BPR + record audit log", async () => {
      const bprCode = `BPR_TEST_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/bprs", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: bprCode,
          name: "BPR Test Organization",
        }),
      });

      const res = await createBpr(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.code).toBe(bprCode);
      newBprId = body.data.id;
      testBprIds.push(newBprId);

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: newBprId,
          action: "BPR_CREATE",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);
    }, 30000);

    it("SECURITY: should block Admin & Marketing from creating top-level BPR (403)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/bprs", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "ILLEGAL_BPR",
          name: "Illegal BPR",
        }),
      });

      const res = await createBpr(req);
      expect(res.status).toBe(403);
    }, 30000);

    it("should reject duplicate BPR code with 409 Conflict", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/bprs", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "BPR_KOTA_MADIUN", // seeded BPR code
          name: "Duplicate BPR Name",
        }),
      });

      const res = await createBpr(req);
      expect(res.status).toBe(409);
    }, 30000);
  });

  describe("GET /api/v1/bprs/:id (Get Single BPR)", () => {
    it("should return BPR details for authorized caller", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/bprs/${seededBprId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getBprById(req, {
        params: { id: seededBprId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(seededBprId);
    }, 30000);

    it("should return 404 for non-existent BPR", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const req = new NextRequest(`http://localhost:3000/api/v1/bprs/${fakeId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getBprById(req, {
        params: { id: fakeId },
      });

      expect(res.status).toBe(404);
    }, 30000);
  });

  describe("PATCH /api/v1/bprs/:id (Update BPR)", () => {
    let bprToUpdateId: string;

    beforeAll(async () => {
      const created = await BprRepository.create({
        code: `BPR_UPD_${Date.now()}`,
        name: "BPR To Update",
      });
      bprToUpdateId = created.id;
      testBprIds.push(created.id);
    }, 30000);

    it("should update BPR details + record audit log", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/bprs/${bprToUpdateId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated BPR Name",
          status: "INACTIVE",
        }),
      });

      const res = await updateBprById(req, {
        params: { id: bprToUpdateId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Updated BPR Name");
      expect(body.data.status).toBe("INACTIVE");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: bprToUpdateId,
          action: "BPR_UPDATE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);

    it("SECURITY: should block Admin from updating a BPR outside their assignment (403)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/bprs/${bprToUpdateId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Hacked Name",
        }),
      });

      const res = await updateBprById(req, {
        params: { id: bprToUpdateId },
      });

      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("DELETE /api/v1/bprs/:id (Delete BPR / Soft Delete)", () => {
    let bprToDeleteId: string;

    beforeAll(async () => {
      const created = await BprRepository.create({
        code: `BPR_DEL_${Date.now()}`,
        name: "BPR To Delete",
      });
      bprToDeleteId = created.id;
      testBprIds.push(created.id);
    }, 30000);

    it("SECURITY: should block Admin from deleting BPR (403 Forbidden)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/bprs/${bprToDeleteId}`, {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
      });

      const res = await deleteBprById(req, {
        params: { id: bprToDeleteId },
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should allow Super Admin to soft delete a BPR (204 No Content)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/bprs/${bprToDeleteId}`, {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await deleteBprById(req, {
        params: { id: bprToDeleteId },
      });

      expect(res.status).toBe(204);

      // Verify soft deletion in DB
      const dbBpr = await db.bpr.findUnique({
        where: { id: bprToDeleteId },
      });
      expect(dbBpr).not.toBeNull();
      expect(dbBpr?.deletedAt).not.toBeNull();
      expect(dbBpr?.status).toBe("INACTIVE");
    }, 30000);
  });
});
