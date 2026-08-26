import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listBranches, POST as createBranch } from "@/app/api/v1/branches/route";
import {
  GET as getBranchById,
  PATCH as updateBranchById,
  DELETE as deleteBranchById,
} from "@/app/api/v1/branches/[id]/route";
import { UserRepository, BranchRepository, BprRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-019: Branch Management API & BPR Relationship Scope", () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketingToken: string;

  let seededBprId: string;
  let branchMadiunId: string;
  let branchMagetanId: string;

  let otherBprId: string;

  const testUserIds: string[] = [];
  const testBranchIds: string[] = [];
  const testBprIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch Roles & Seeded BPR / Branches
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    const seededBpr = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    if (!saRole || !admRole || !mktRole || !seededBpr) {
      throw new Error("Required seed data not found");
    }
    seededBprId = seededBpr.id;

    // Create test branches under seeded BPR
    const bMadiun = await db.branch.create({
      data: {
        bprId: seededBprId,
        code: `BR_MDN_${Date.now()}`,
        name: "Cabang Madiun Test",
      },
    });
    branchMadiunId = bMadiun.id;
    testBranchIds.push(bMadiun.id);

    const bMagetan = await db.branch.create({
      data: {
        bprId: seededBprId,
        code: `BR_MGT_${Date.now()}`,
        name: "Cabang Magetan Test",
      },
    });
    branchMagetanId = bMagetan.id;
    testBranchIds.push(bMagetan.id);

    // 2. Create another BPR to test isolation
    const otherBpr = await BprRepository.create({
      code: `BPR_OTHER_${Date.now()}`,
      name: "BPR Other Region",
    });
    otherBprId = otherBpr.id;
    testBprIds.push(otherBpr.id);

    // 3. Create Test Users
    const sa = await UserRepository.create({
      username: `sa_br_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin Branch Test",
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
      username: `adm_br_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin Branch Madiun",
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
      username: `mkt_br_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing Branch Test",
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
    if (testBranchIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testBranchIds } } });
      await db.branch.deleteMany({ where: { id: { in: testBranchIds } } });
    }
    if (testBprIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testBprIds } } });
      await db.bpr.deleteMany({ where: { id: { in: testBprIds } } });
    }
  }, 45000);

  describe("GET /api/v1/branches (List Branches)", () => {
    it("should list all branches with pagination for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/branches", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await listBranches(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.meta).toBeDefined();
      expect(body.meta.total).toBeGreaterThanOrEqual(2);
    }, 30000);

    it("should filter branches by bprId when requested by Super Admin", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/branches?bprId=${seededBprId}`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        }
      );

      const res = await listBranches(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      for (const br of body.data) {
        expect(br.bprId).toBe(seededBprId);
      }
    }, 30000);

    it("should automatically restrict Admin to their assigned BPR's branches", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/branches", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await listBranches(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      for (const br of body.data) {
        expect(br.bprId).toBe(seededBprId);
      }
    }, 30000);

    it("should reject Marketing with 403 Forbidden", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/branches", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const res = await listBranches(req);
      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("POST /api/v1/branches (Create Branch)", () => {
    let createdBranchId: string;

    it("should allow Super Admin to create a new branch + record audit log", async () => {
      const branchCode = `KC_TEST_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/branches", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: seededBprId,
          code: branchCode,
          name: "Kantor Cabang Uji Coba",
          address: "Jl. Pahlawan No. 123",
        }),
      });

      const res = await createBranch(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.code).toBe(branchCode);
      expect(body.data.bprId).toBe(seededBprId);
      createdBranchId = body.data.id;
      testBranchIds.push(createdBranchId);

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: createdBranchId,
          action: "BRANCH_CREATE",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);
    }, 30000);

    it("should allow Admin to create branch within their assigned BPR", async () => {
      const branchCode = `KC_ADM_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/branches", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: seededBprId,
          code: branchCode,
          name: "Kantor Cabang Admin",
        }),
      });

      const res = await createBranch(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      testBranchIds.push(body.data.id);
    }, 30000);

    it("SECURITY: should block Admin from creating branch in another BPR (403)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/branches", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: otherBprId,
          code: "ILLEGAL_BRANCH",
          name: "Illegal Branch",
        }),
      });

      const res = await createBranch(req);
      expect(res.status).toBe(403);
    }, 30000);

    it("should reject duplicate branch code within same BPR with 409 Conflict", async () => {
      const existing = await db.branch.findUnique({ where: { id: branchMadiunId } });
      const req = new NextRequest("http://localhost:3000/api/v1/branches", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bprId: seededBprId,
          code: existing?.code || "BR_MDN_TEST",
          name: "Duplicate Branch",
        }),
      });

      const res = await createBranch(req);
      expect(res.status).toBe(409);
    }, 30000);
  });

  describe("GET /api/v1/branches/:id (Get Single Branch)", () => {
    it("should return branch details for authorized caller", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/branches/${branchMadiunId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await getBranchById(req, {
        params: { id: branchMadiunId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(branchMadiunId);
      expect(body.data.bpr).toBeDefined();
    }, 30000);

    it("should return 404 for non-existent branch", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const req = new NextRequest(`http://localhost:3000/api/v1/branches/${fakeId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getBranchById(req, {
        params: { id: fakeId },
      });

      expect(res.status).toBe(404);
    }, 30000);
  });

  describe("PATCH /api/v1/branches/:id (Update Branch)", () => {
    let branchToUpdateId: string;

    beforeAll(async () => {
      const created = await BranchRepository.create({
        bprId: seededBprId,
        code: `UPD_BR_${Date.now()}`,
        name: "Branch To Update",
      });
      branchToUpdateId = created.id;
      testBranchIds.push(created.id);
    }, 30000);

    it("should update branch name & address + record audit log", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/branches/${branchToUpdateId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Branch Name",
          address: "Jl. Baru No. 456",
        }),
      });

      const res = await updateBranchById(req, {
        params: { id: branchToUpdateId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Updated Branch Name");
      expect(body.data.address).toBe("Jl. Baru No. 456");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: branchToUpdateId,
          action: "BRANCH_UPDATE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);
  });

  describe("DELETE /api/v1/branches/:id (Soft Delete Branch)", () => {
    let branchToDeleteId: string;

    beforeAll(async () => {
      const created = await BranchRepository.create({
        bprId: seededBprId,
        code: `DEL_BR_${Date.now()}`,
        name: "Branch To Delete",
      });
      branchToDeleteId = created.id;
      testBranchIds.push(created.id);
    }, 30000);

    it("should allow soft deletion of branch + record audit log (204 No Content)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/branches/${branchToDeleteId}`, {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await deleteBranchById(req, {
        params: { id: branchToDeleteId },
      });

      expect(res.status).toBe(204);

      // Verify soft delete in DB
      const dbBranch = await db.branch.findUnique({
        where: { id: branchToDeleteId },
      });
      expect(dbBranch).not.toBeNull();
      expect(dbBranch?.deletedAt).not.toBeNull();
      expect(dbBranch?.status).toBe("INACTIVE");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: branchToDeleteId,
          action: "BRANCH_DELETE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);
  });
});
