import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-042: Protected Routes Middleware Tests", { timeout: 30000 }, () => {
  let marketingToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!mktRole) throw new Error("Role MARKETING must exist in DB");

    const mktUser = await UserRepository.create({
      username: `mkt_route_test_${Date.now()}`,
      fullName: "Marketing Route Tester",
      roleId: mktRole.id,
      password: "MarketingPassword123!",
    });
    testUserId = mktUser.id;

    marketingToken = await signSessionToken({
      userId: mktUser.id,
      username: mktUser.username,
      fullName: mktUser.fullName,
      role: "MARKETING",
    });
  }, 30000);

  afterAll(async () => {
    if (testUserId) {
      await db.auditLog.deleteMany({ where: { userId: testUserId } });
      await db.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  }, 30000);

  describe("Frontend Route Protection", () => {
    it("should redirect unauthenticated user from home '/' to '/login'", async () => {
      const req = new NextRequest("http://localhost:3000/");
      const res = await middleware(req);

      expect(res.status).toBe(307); // NextResponse.redirect
      const location = res.headers.get("location");
      expect(location).toBe("http://localhost:3000/login");
    });

    it("should redirect unauthenticated user from deep page with callbackUrl", async () => {
      const req = new NextRequest("http://localhost:3000/calculator?method=FLAT");
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe(
        "http://localhost:3000/login?callbackUrl=%2Fcalculator%3Fmethod%3DFLAT"
      );
    });

    it("should allow unauthenticated user to access '/login'", async () => {
      const req = new NextRequest("http://localhost:3000/login");
      const res = await middleware(req);

      expect(res.status).toBe(200); // NextResponse.next()
    });

    it("should redirect authenticated user accessing '/login' to home '/'", async () => {
      const req = new NextRequest("http://localhost:3000/login", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${marketingToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe("http://localhost:3000/");
    });

    it("should redirect authenticated user accessing '/login?callbackUrl=/calculator' to callbackUrl", async () => {
      const req = new NextRequest("http://localhost:3000/login?callbackUrl=%2Fcalculator", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${marketingToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBe("http://localhost:3000/calculator");
    });

    it("should allow authenticated user to access protected frontend page '/calculator'", async () => {
      const req = new NextRequest("http://localhost:3000/calculator", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${marketingToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200); // NextResponse.next()
    });
  });

  describe("API Route Protection", () => {
    it("should allow public API endpoint POST /api/v1/auth/login without token", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
      });
      const res = await middleware(req);

      expect(res.status).toBe(200); // NextResponse.next()
    });

    it("should block protected API endpoint with 401 JSON when unauthenticated", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/simulations", {
        method: "GET",
      });
      const res = await middleware(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("should allow protected API endpoint when valid session cookie exists", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/simulations", {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${marketingToken}`,
        },
      });
      const res = await middleware(req);

      expect(res.status).toBe(200); // NextResponse.next()
    });
  });

  describe("Static Assets & Internals", () => {
    it("should pass static assets and image files directly", async () => {
      const req = new NextRequest("http://localhost:3000/favicon.ico");
      const res = await middleware(req);

      expect(res.status).toBe(200); // NextResponse.next()
    });
  });
});
