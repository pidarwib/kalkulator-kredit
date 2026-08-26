import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as adminOnlyGet } from "@/app/api/v1/test/permissions/admin-only/route";
import { requirePermission, requireAnyPermission } from "@/lib/rbac";
import { UserRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-014: Authorization Middleware (requirePermission)", () => {
  const adminUsername = `authz_admin_${Date.now()}`;
  const marketingUsername = `authz_mkt_${Date.now()}`;
  let adminUserId: string;
  let marketingUserId: string;
  let adminToken: string;
  let marketingToken: string;

  beforeAll(async () => {
    const adminRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!adminRole || !mktRole) throw new Error("Roles must exist");

    // Create Admin user
    const admin = await UserRepository.create({
      username: adminUsername,
      password: "Password123!",
      fullName: "Auth Middleware Admin",
      roleId: adminRole.id,
      status: "ACTIVE",
    });
    adminUserId = admin.id;
    adminToken = await signSessionToken({
      userId: admin.id,
      username: admin.username,
      fullName: admin.fullName,
      role: "ADMIN",
    });

    // Create Marketing user
    const marketing = await UserRepository.create({
      username: marketingUsername,
      password: "Password123!",
      fullName: "Auth Middleware Marketing",
      roleId: mktRole.id,
      status: "ACTIVE",
    });
    marketingUserId = marketing.id;
    marketingToken = await signSessionToken({
      userId: marketing.id,
      username: marketing.username,
      fullName: marketing.fullName,
      role: "MARKETING",
    });
  });

  afterAll(async () => {
    const ids = [adminUserId, marketingUserId].filter(Boolean);
    if (ids.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  describe("requirePermission() core behavior", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/test", {
        method: "GET",
      });

      const result = await requirePermission(req, "USER_VIEW");

      expect(result.allowed).toBe(false);
      expect(result.errorResponse?.status).toBe(401);

      const body = await result.errorResponse?.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 403 Forbidden when MARKETING user requests USER_VIEW (admin-only permission)", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/v1/test/permissions/admin-only",
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
        }
      );

      const result = await requirePermission(req, "USER_VIEW");

      expect(result.allowed).toBe(false);
      expect(result.user?.role).toBe("MARKETING");
      expect(result.errorResponse?.status).toBe(403);

      const body = await result.errorResponse?.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("should grant access when ADMIN user requests USER_VIEW permission", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/v1/test/permissions/admin-only",
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
        }
      );

      const result = await requirePermission(req, "USER_VIEW");

      expect(result.allowed).toBe(true);
      expect(result.user?.role).toBe("ADMIN");
      expect(result.errorResponse).toBeUndefined();
    });

    it("should return 403 when MARKETING user requests MASTER_VIEW permission", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/test", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const result = await requirePermission(req, "MASTER_VIEW");

      expect(result.allowed).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });

    it("should grant CREDIT_CALCULATE to both ADMIN and MARKETING", async () => {
      const adminReq = new NextRequest("http://localhost:3000/api/v1/test", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
      });
      const mktReq = new NextRequest("http://localhost:3000/api/v1/test", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      const adminResult = await requirePermission(adminReq, "CREDIT_CALCULATE");
      const mktResult = await requirePermission(mktReq, "CREDIT_CALCULATE");

      expect(adminResult.allowed).toBe(true);
      expect(mktResult.allowed).toBe(true);
    });
  });

  describe("requireAnyPermission() behavior", () => {
    it("should allow access when user has any of the required permissions", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/test", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      // Marketing has SIMULATION_CREATE but not USER_CREATE
      const result = await requireAnyPermission(req, [
        "USER_CREATE",
        "SIMULATION_CREATE",
      ]);

      expect(result.allowed).toBe(true);
    });

    it("should deny access when user has none of the required permissions", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/test", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
      });

      // Marketing has neither USER_CREATE nor MASTER_CREATE
      const result = await requireAnyPermission(req, [
        "USER_CREATE",
        "MASTER_CREATE",
      ]);

      expect(result.allowed).toBe(false);
      expect(result.errorResponse?.status).toBe(403);
    });
  });

  describe("Admin-only test route integration", () => {
    it("should return 200 with user context for ADMIN accessing admin-only route", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/v1/test/permissions/admin-only",
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
        }
      );

      const res = await adminOnlyGet(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.role).toBe("ADMIN");
      expect(body.user.username).toBe(adminUsername);
    });

    it("should return 403 when MARKETING accesses admin-only route (frontend hiding is not security)", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/v1/test/permissions/admin-only",
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingToken}` },
        }
      );

      const res = await adminOnlyGet(req);

      // Server-side permission check blocks Marketing even if frontend shows the button
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("should return 401 when unauthenticated accesses admin-only route", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/v1/test/permissions/admin-only",
        { method: "GET" }
      );

      const res = await adminOnlyGet(req);

      expect(res.status).toBe(401);
    });
  });
});
