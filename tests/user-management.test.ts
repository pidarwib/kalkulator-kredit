import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listUsers, POST as createUser } from "@/app/api/v1/users/route";
import {
  GET as getUserById,
  PATCH as updateUserById,
  DELETE as deleteUserById,
} from "@/app/api/v1/users/[id]/route";
import { UserRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-016: User Management CRUD & Privilege Security", () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let adminMagetanId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let adminMagetanToken: string;
  let marketingToken: string;

  let superAdminRoleId: string;
  let adminRoleId: string;
  let marketingRoleId: string;

  let bprId: string;
  let branchMadiunId: string;
  let branchMagetanId: string;

  // Track created test users for cleanup
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch Roles
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!saRole || !admRole || !mktRole) throw new Error("Roles must exist");

    superAdminRoleId = saRole.id;
    adminRoleId = admRole.id;
    marketingRoleId = mktRole.id;

    // 2. Fetch BPR
    const bpr = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    if (!bpr) throw new Error("BPR Kota Madiun must exist");
    bprId = bpr.id;

    // 3. Create Branches
    const brMdn = await db.branch.create({
      data: {
        bprId,
        code: `BR_UM_MDN_${Date.now()}`,
        name: "Cabang Madiun UM",
      },
    });
    branchMadiunId = brMdn.id;

    const brMgt = await db.branch.create({
      data: {
        bprId,
        code: `BR_UM_MGT_${Date.now()}`,
        name: "Cabang Magetan UM",
      },
    });
    branchMagetanId = brMgt.id;

    // 4. Create Caller Users
    const sa = await UserRepository.create({
      username: `sa_mgmt_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin Mgmt",
      roleId: superAdminRoleId,
      status: "ACTIVE",
    });
    superAdminId = sa.id;
    createdUserIds.push(sa.id);
    superAdminToken = await signSessionToken({
      userId: sa.id,
      username: sa.username,
      fullName: sa.fullName,
      role: "SUPER_ADMIN",
    });

    const admMdn = await UserRepository.create({
      username: `adm_mdn_mgmt_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin Madiun Mgmt",
      roleId: adminRoleId,
      bprId,
      branchId: branchMadiunId,
      status: "ACTIVE",
    });
    adminMadiunId = admMdn.id;
    createdUserIds.push(admMdn.id);
    adminMadiunToken = await signSessionToken({
      userId: admMdn.id,
      username: admMdn.username,
      fullName: admMdn.fullName,
      role: "ADMIN",
    });

    const admMgt = await UserRepository.create({
      username: `adm_mgt_mgmt_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin Magetan Mgmt",
      roleId: adminRoleId,
      bprId,
      branchId: branchMagetanId,
      status: "ACTIVE",
    });
    adminMagetanId = admMgt.id;
    createdUserIds.push(admMgt.id);
    adminMagetanToken = await signSessionToken({
      userId: admMgt.id,
      username: admMgt.username,
      fullName: admMgt.fullName,
      role: "ADMIN",
    });

    const mkt = await UserRepository.create({
      username: `mkt_mgmt_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing Mgmt",
      roleId: marketingRoleId,
      bprId,
      branchId: branchMadiunId,
      status: "ACTIVE",
    });
    marketingId = mkt.id;
    createdUserIds.push(mkt.id);
    marketingToken = await signSessionToken({
      userId: mkt.id,
      username: mkt.username,
      fullName: mkt.fullName,
      role: "MARKETING",
    });
  }, 45000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } });
      await db.auditLog.deleteMany({ where: { entityId: { in: createdUserIds } } });
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    const branchIds = [branchMadiunId, branchMagetanId].filter(Boolean);
    if (branchIds.length > 0) {
      await db.branch.deleteMany({ where: { id: { in: branchIds } } });
    }
  }, 45000);

  describe("GET /api/v1/users (List Users)", () => {
    it("should list users with pagination for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users?page=1&pageSize=10", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await listUsers(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
    }, 30000);

    it("should restrict Admin user list to their assigned BPR and branch and hide Super Admins", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users?page=1&pageSize=20", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await listUsers(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      for (const u of body.data) {
        expect(u.role?.code).not.toBe("SUPER_ADMIN");
        expect(u.bprId).toBe(bprId);
        expect(u.branchId).toBe(branchMadiunId);
      }
    }, 30000);

    it("should reject Marketing user with 403 Forbidden (no USER_VIEW permission)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const res = await listUsers(req);
      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("POST /api/v1/users (Create User)", () => {
    let testCreatedUserId: string;

    it("should allow Super Admin to create a user and record audit log", async () => {
      const uniqueUsername = `created_by_sa_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: uniqueUsername,
          password: "SecurePassword123!",
          fullName: "Created By Super Admin",
          email: `${uniqueUsername}@example.com`,
          roleCode: "MARKETING",
          bprId,
          branchId: branchMadiunId,
        }),
      });

      const res = await createUser(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.username).toBe(uniqueUsername);
      expect(body.data.passwordHash).toBeUndefined(); // passwordHash is stripped
      testCreatedUserId = body.data.id;
      createdUserIds.push(testCreatedUserId);

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          action: "USER_CREATE",
          entityId: testCreatedUserId,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);
    }, 30000);

    it("should allow Admin to create a MARKETING user in their own branch", async () => {
      const uniqueUsername = `created_by_adm_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: uniqueUsername,
          password: "SecurePassword123!",
          fullName: "Created By Admin",
          email: `${uniqueUsername}@example.com`,
          roleCode: "MARKETING",
        }),
      });

      const res = await createUser(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.username).toBe(uniqueUsername);
      expect(body.data.bprId).toBe(bprId);
      expect(body.data.branchId).toBe(branchMadiunId);
      createdUserIds.push(body.data.id);
    }, 30000);

    it("SECURITY: should block Admin from creating an ADMIN or SUPER_ADMIN (Privilege Escalation)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: `hacker_adm_${Date.now()}`,
          password: "SecurePassword123!",
          fullName: "Privilege Escalation Attempt",
          roleCode: "SUPER_ADMIN",
        }),
      });

      const res = await createUser(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("MARKETING");
    }, 30000);

    it("should reject duplicate username with 409 Conflict", async () => {
      const existingUser = await db.user.findFirst({ where: { id: marketingId } });
      const duplicateUsername = existingUser!.username;

      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: duplicateUsername,
          password: "SecurePassword123!",
          fullName: "Duplicate User",
          roleCode: "MARKETING",
        }),
      });

      const res = await createUser(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe("CONFLICT");
    }, 30000);

    it("should reject weak password violating policy with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: `weak_pwd_${Date.now()}`,
          password: "simple",
          fullName: "Weak Password User",
          roleCode: "MARKETING",
        }),
      });

      const res = await createUser(req);
      expect(res.status).toBe(400);
    }, 30000);
  });

  describe("GET /api/v1/users/:id (Get Single User)", () => {
    it("should return user details for authorized caller", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${marketingId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getUserById(req, {
        params: Promise.resolve({ id: marketingId }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(marketingId);
      expect(body.data.passwordHash).toBeUndefined();
    }, 30000);

    it("should block Admin from viewing a Super Admin user (403 Forbidden)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${superAdminId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await getUserById(req, {
        params: Promise.resolve({ id: superAdminId }),
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should block Admin Madiun from viewing a user in Branch Magetan (403 Forbidden)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${adminMagetanId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await getUserById(req, {
        params: Promise.resolve({ id: adminMagetanId }),
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should return 404 for non-existent user", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${fakeId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getUserById(req, {
        params: Promise.resolve({ id: fakeId }),
      });

      expect(res.status).toBe(404);
    }, 30000);
  });

  describe("PATCH /api/v1/users/:id (Update User)", () => {
    it("should allow Super Admin to update user name and status + record audit log", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${marketingId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fullName: "Updated Marketing Full Name",
          status: "INACTIVE",
        }),
      });

      const res = await updateUserById(req, {
        params: Promise.resolve({ id: marketingId }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.fullName).toBe("Updated Marketing Full Name");
      expect(body.data.status).toBe("INACTIVE");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: marketingId,
          action: "USER_DEACTIVATE",
        },
      });
      expect(audit).not.toBeNull();

      // Restore to ACTIVE
      await db.user.update({
        where: { id: marketingId },
        data: { status: "ACTIVE" },
      });
    }, 30000);

    it("SECURITY: should block Admin from elevating Marketing user to SUPER_ADMIN (403)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${marketingId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          roleId: superAdminRoleId,
        }),
      });

      const res = await updateUserById(req, {
        params: Promise.resolve({ id: marketingId }),
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("SECURITY: should block Admin from changing their own role (403)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${adminMadiunId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          roleId: superAdminRoleId,
        }),
      });

      const res = await updateUserById(req, {
        params: Promise.resolve({ id: adminMadiunId }),
      });

      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("DELETE /api/v1/users/:id (Soft Delete)", () => {
    let userToDeleteId: string;

    beforeAll(async () => {
      const user = await UserRepository.create({
        username: `to_delete_${Date.now()}`,
        password: "Password123!",
        fullName: "User To Delete",
        roleId: marketingRoleId,
        status: "ACTIVE",
      });
      userToDeleteId = user.id;
      createdUserIds.push(user.id);
    }, 30000);

    it("should prevent Super Admin from deleting their own account (400 Bad Request)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${superAdminId}`, {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await deleteUserById(req, {
        params: Promise.resolve({ id: superAdminId }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("CANNOT_DELETE_SELF");
    }, 30000);

    it("should block Admin from deleting users (Admin lacks USER_DELETE -> 403)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${userToDeleteId}`, {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
      });

      const res = await deleteUserById(req, {
        params: Promise.resolve({ id: userToDeleteId }),
      });

      expect(res.status).toBe(403);
    }, 30000);

    it("should allow Super Admin to soft delete a user (204 No Content)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/users/${userToDeleteId}`, {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await deleteUserById(req, {
        params: Promise.resolve({ id: userToDeleteId }),
      });

      expect(res.status).toBe(204);

      // Verify soft delete in DB
      const dbUser = await db.user.findUnique({
        where: { id: userToDeleteId },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.deletedAt).not.toBeNull();

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: userToDeleteId,
          action: "USER_DELETE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);
  });
});
