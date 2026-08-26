import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET as getMe } from "@/app/api/v1/auth/me/route";
import { POST as postLogout } from "@/app/api/v1/auth/logout/route";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";
import { UserRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth";

describe("TASK-012: Session / Auth Middleware & Endpoints", () => {
  const marketingUsername = `auth_mw_mkt_${Date.now()}`;
  const superAdminUsername = `auth_mw_sa_${Date.now()}`;
  let marketingUserId: string;
  let superAdminUserId: string;
  let marketingToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const roles = await db.role.findMany();
    const mktRole = roles.find((r) => r.code === "MARKETING");
    const saRole = roles.find((r) => r.code === "SUPER_ADMIN");

    if (!mktRole || !saRole) {
      throw new Error("Roles must exist in database");
    }

    // Create Marketing user
    const mktUser = await UserRepository.create({
      username: marketingUsername,
      password: "Password123!",
      fullName: "Marketing Middleware Test",
      roleId: mktRole.id,
      status: "ACTIVE",
    });
    marketingUserId = mktUser.id;
    marketingToken = await signSessionToken({
      userId: mktUser.id,
      username: mktUser.username,
      fullName: mktUser.fullName,
      role: "MARKETING",
    });

    // Create Super Admin user
    const saUser = await UserRepository.create({
      username: superAdminUsername,
      password: "Password123!",
      fullName: "Super Admin Middleware Test",
      roleId: saRole.id,
      status: "ACTIVE",
    });
    superAdminUserId = saUser.id;
    superAdminToken = await signSessionToken({
      userId: saUser.id,
      username: saUser.username,
      fullName: saUser.fullName,
      role: "SUPER_ADMIN",
    });
  });

  afterAll(async () => {
    const ids = [marketingUserId, superAdminUserId].filter(Boolean);
    if (ids.length > 0) {
      await db.auditLog.deleteMany({
        where: { userId: { in: ids } },
      });
      await db.user.deleteMany({
        where: { id: { in: ids } },
      });
    }
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return 200 with user context, permissions, and OWN scope for Marketing user via cookie", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${marketingToken}`,
        },
      });

      const res = await getMe(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(marketingUserId);
      expect(data.user.username).toBe(marketingUsername);
      expect(data.user.role).toBe("MARKETING");
      expect(data.user.scope).toBe("OWN");
      expect(Array.isArray(data.user.permissions)).toBe(true);
      expect(data.user.permissions).toContain("CREDIT_CALCULATE");
      expect(data.user.permissions).toContain("SIMULATION_CREATE");
      expect(data.user.passwordHash).toBeUndefined();
    });

    it("should return ALL scope for Super Admin user via Bearer token", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        method: "GET",
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      const res = await getMe(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.user.role).toBe("SUPER_ADMIN");
      expect(data.user.scope).toBe("ALL");
      expect(data.user.permissions).toContain("USER_CREATE");
      expect(data.user.permissions).toContain("AUDIT_VIEW");
    });

    it("should reject unauthenticated request with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        method: "GET",
      });

      const res = await getMe(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject invalid token with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=invalid.jwt.token`,
        },
      });

      const res = await getMe(req);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should return 204 and clear session cookie", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/logout", {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${marketingToken}`,
        },
      });

      const res = await postLogout(req);
      expect(res.status).toBe(204);

      const cookie = res.cookies.get(SESSION_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe("");
      expect(cookie?.maxAge).toBe(0);
    });
  });

  describe("Edge Next.js Middleware (src/middleware.ts)", () => {
    it("should pass public login endpoint without token", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
      });

      const res = await middleware(req);
      expect(res.status).toBe(200); // NextResponse.next()
    });

    it("should block protected API endpoint with 401 when unauthenticated", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "GET",
      });

      const res = await middleware(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should allow protected API endpoint when valid session cookie exists", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/users", {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(200); // NextResponse.next()
    });
  });
});
