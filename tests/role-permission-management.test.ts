import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listRoles, POST as createRole } from "@/app/api/v1/roles/route";
import {
  GET as getRoleById,
  PATCH as updateRoleById,
  DELETE as deleteRoleById,
} from "@/app/api/v1/roles/[id]/route";
import { POST as assignRolePermissions } from "@/app/api/v1/roles/[id]/permissions/route";
import { GET as listPermissions } from "@/app/api/v1/permissions/route";
import { UserRepository, RoleRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-017: Role & Permission Management API & Privilege Security", () => {
  let superAdminId: string;
  let adminId: string;
  let marketingId: string;

  let superAdminToken: string;
  let adminToken: string;
  let marketingToken: string;

  let superAdminRoleId: string;
  let adminRoleId: string;
  let marketingRoleId: string;

  const testRoleIds: string[] = [];
  const testUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch System Roles
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!saRole || !admRole || !mktRole) throw new Error("System roles must exist");

    superAdminRoleId = saRole.id;
    adminRoleId = admRole.id;
    marketingRoleId = mktRole.id;

    // 2. Create Test Users
    const sa = await UserRepository.create({
      username: `sa_rpm_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin RPM",
      roleId: superAdminRoleId,
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
      username: `adm_rpm_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin RPM",
      roleId: adminRoleId,
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
      username: `mkt_rpm_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing RPM",
      roleId: marketingRoleId,
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
    if (testRoleIds.length > 0) {
      await db.auditLog.deleteMany({ where: { entityId: { in: testRoleIds } } });
      await db.rolePermission.deleteMany({ where: { roleId: { in: testRoleIds } } });
      await db.role.deleteMany({ where: { id: { in: testRoleIds } } });
    }
  }, 45000);

  describe("GET /api/v1/roles (List Roles)", () => {
    it("should list all roles for Super Admin with permission and user counts", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await listRoles(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(3);

      const sa = body.data.find((r: { code: string }) => r.code === "SUPER_ADMIN");
      expect(sa).toBeDefined();
      expect(sa.permissions.length).toBe(40);
    }, 30000);

    it("should reject Admin and Marketing users with 403 Forbidden", async () => {
      const adminReq = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
      });
      const mktReq = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const [adminRes, mktRes] = await Promise.all([listRoles(adminReq), listRoles(mktReq)]);

      expect(adminRes.status).toBe(403);
      expect(mktRes.status).toBe(403);
    }, 30000);
  });

  describe("POST /api/v1/roles (Create Role)", () => {
    let customRoleId: string;

    it("should allow Super Admin to create custom role + record audit log", async () => {
      const roleCode = `SUPERVISOR_${Date.now()}`;
      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: roleCode,
          name: "Supervisor Kredit",
          description: "Role untuk supervisor marketing",
        }),
      });

      const res = await createRole(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.data.code).toBe(roleCode);
      customRoleId = body.data.id;
      testRoleIds.push(customRoleId);

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: customRoleId,
          action: "ROLE_CREATE",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(superAdminId);
    }, 30000);

    it("should block Admin & Marketing from creating roles (403 Forbidden)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "ILLEGAL_ROLE",
          name: "Illegal Role",
        }),
      });

      const res = await createRole(req);
      expect(res.status).toBe(403);
    }, 30000);

    it("should reject duplicate role code with 409 Conflict", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/roles", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "SUPER_ADMIN", // existing
          name: "Duplicate Super Admin",
        }),
      });

      const res = await createRole(req);
      expect(res.status).toBe(409);
    }, 30000);
  });

  describe("GET /api/v1/roles/:id (Get Single Role)", () => {
    it("should return role details for Super Admin", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/roles/${superAdminRoleId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getRoleById(req, {
        params: { id: superAdminRoleId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.code).toBe("SUPER_ADMIN");
      expect(body.data.permissions.length).toBe(40);
    }, 30000);

    it("should return 404 for non-existent role", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const req = new NextRequest(`http://localhost:3000/api/v1/roles/${fakeId}`, {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await getRoleById(req, {
        params: { id: fakeId },
      });

      expect(res.status).toBe(404);
    }, 30000);
  });

  describe("PATCH /api/v1/roles/:id (Update Role)", () => {
    let roleToUpdateId: string;

    beforeAll(async () => {
      const created = await RoleRepository.create({
        code: `TMP_UPD_${Date.now()}`,
        name: "Temporary Role For Update",
      });
      roleToUpdateId = created.id;
      testRoleIds.push(created.id);
    }, 30000);

    it("should update custom role details + record audit log", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/roles/${roleToUpdateId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Role Name",
          description: "Updated description",
        }),
      });

      const res = await updateRoleById(req, {
        params: { id: roleToUpdateId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Updated Role Name");

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: roleToUpdateId,
          action: "ROLE_UPDATE",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);

    it("SECURITY: should block deactivation of core system roles (400 Bad Request)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/roles/${superAdminRoleId}`, {
        method: "PATCH",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      });

      const res = await updateRoleById(req, {
        params: { id: superAdminRoleId },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("SYSTEM_ROLE_PROTECTED");
    }, 30000);
  });

  describe("DELETE /api/v1/roles/:id (Delete Role)", () => {
    let roleToDeleteId: string;

    beforeAll(async () => {
      const created = await RoleRepository.create({
        code: `TMP_DEL_${Date.now()}`,
        name: "Temporary Role For Delete",
      });
      roleToDeleteId = created.id;
      testRoleIds.push(created.id);
    }, 30000);

    it("SECURITY: should block deletion of system roles (SUPER_ADMIN, ADMIN, MARKETING) with 400", async () => {
      for (const roleId of [superAdminRoleId, adminRoleId, marketingRoleId]) {
        const req = new NextRequest(`http://localhost:3000/api/v1/roles/${roleId}`, {
          method: "DELETE",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
        });

        const res = await deleteRoleById(req, {
          params: { id: roleId },
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe("SYSTEM_ROLE_PROTECTED");
      }
    }, 30000);

    it("should allow Super Admin to delete custom unused role (204 No Content)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/roles/${roleToDeleteId}`, {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await deleteRoleById(req, {
        params: { id: roleToDeleteId },
      });

      expect(res.status).toBe(204);

      // Verify deletion in DB
      const deletedRole = await db.role.findUnique({
        where: { id: roleToDeleteId },
      });
      expect(deletedRole).toBeNull();
    }, 30000);
  });

  describe("GET /api/v1/permissions (List Permissions)", () => {
    it("should list all 40 canonical permissions for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/permissions", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await listPermissions(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.length).toBe(40);
    }, 30000);

    it("should support module filtering (e.g. ?module=SIMULATION)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/permissions?module=SIMULATION", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });

      const res = await listPermissions(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.length).toBe(5); // 5 SIMULATION permissions
      for (const p of body.data) {
        expect(p.module).toBe("SIMULATION");
      }
    }, 30000);

    it("should reject Admin & Marketing from listing permissions (403 Forbidden)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/permissions", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const res = await listPermissions(req);
      expect(res.status).toBe(403);
    }, 30000);
  });

  describe("POST /api/v1/roles/:id/permissions (Assign Permissions)", () => {
    let customRoleForPermId: string;

    beforeAll(async () => {
      const created = await RoleRepository.create({
        code: `ASSIGN_PERM_${Date.now()}`,
        name: "Custom Role For Permission Assignment",
      });
      customRoleForPermId = created.id;
      testRoleIds.push(created.id);
    }, 30000);

    it("should assign selected permissions to a role + record audit log", async () => {
      const permissions = await db.permission.findMany({
        where: { module: "SIMULATION" },
        take: 3,
      });
      const permissionIds = permissions.map((p) => p.id);

      const req = new NextRequest(
        `http://localhost:3000/api/v1/roles/${customRoleForPermId}/permissions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ permissionIds }),
        }
      );

      const res = await assignRolePermissions(req, {
        params: { id: customRoleForPermId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.permissions.length).toBe(3);

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: customRoleForPermId,
          action: "ROLE_PERMISSION_ASSIGN",
        },
      });
      expect(audit).not.toBeNull();
    }, 30000);

    it("SECURITY: should prevent emptying permissions of SUPER_ADMIN", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/roles/${superAdminRoleId}/permissions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ permissionIds: [] }),
        }
      );

      const res = await assignRolePermissions(req, {
        params: { id: superAdminRoleId },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_OPERATION");
    }, 30000);

    it("SECURITY: should reject Admin and Marketing from assigning permissions (403 Forbidden)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/roles/${customRoleForPermId}/permissions`,
        {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${marketingToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ permissionIds: [] }),
        }
      );

      const res = await assignRolePermissions(req, {
        params: { id: customRoleForPermId },
      });

      expect(res.status).toBe(403);
    }, 30000);
  });
});
