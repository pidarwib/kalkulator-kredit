import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST } from "@/app/api/v1/auth/login/route";
import { NextRequest } from "next/server";
import { UserRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

describe("TASK-011: Login API (POST /api/v1/auth/login)", { timeout: 30000 }, () => {
  const activeUsername = `login_active_${Date.now()}`;
  const inactiveUsername = `login_inactive_${Date.now()}`;
  const password = "Password123!";
  let activeUserId: string;
  let inactiveUserId: string;
  let marketingRoleId: string;

  beforeAll(async () => {
    const role = await db.role.findUnique({
      where: { code: "MARKETING" },
    });
    if (!role) {
      throw new Error("MARKETING role must exist in database");
    }
    marketingRoleId = role.id;

    // Create active user
    const activeUser = await UserRepository.create({
      username: activeUsername,
      password,
      fullName: "Active Marketing User",
      roleId: marketingRoleId,
      status: "ACTIVE",
    });
    activeUserId = activeUser.id;

    // Create inactive user
    const inactiveUser = await UserRepository.create({
      username: inactiveUsername,
      password,
      fullName: "Inactive Marketing User",
      roleId: marketingRoleId,
      status: "INACTIVE",
    });
    inactiveUserId = inactiveUser.id;
  });

  afterAll(async () => {
    // Clean up test users and their audit logs
    const ids = [activeUserId, inactiveUserId].filter(Boolean);
    if (ids.length > 0) {
      await db.auditLog.deleteMany({
        where: { userId: { in: ids } },
      });
      await db.user.deleteMany({
        where: { id: { in: ids } },
      });
    }
  });

  it("should successfully log in with valid credentials and return 200 with session cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: activeUsername,
        password,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe(activeUserId);
    expect(data.user.username).toBe(activeUsername);
    expect(data.user.fullName).toBe("Active Marketing User");
    expect(data.user.role).toBe("MARKETING");
    expect(data.user.passwordHash).toBeUndefined();

    // Verify session cookie
    const cookie = res.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBeDefined();

    // Verify token validity
    const payload = await verifySessionToken(cookie!.value);
    expect(payload).toBeDefined();
    expect(payload?.userId).toBe(activeUserId);
    expect(payload?.role).toBe("MARKETING");
  });

  it("should reject login with wrong password with 401 generic error", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: activeUsername,
        password: "IncorrectPassword123!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe("INVALID_CREDENTIALS");
    expect(data.error.message).toBe("Username atau password tidak valid.");
  });

  it("should reject login for unknown user with 401 generic error", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "nonexistent_user_99999",
        password,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe("INVALID_CREDENTIALS");
    expect(data.error.message).toBe("Username atau password tidak valid.");
  });

  it("should reject login for inactive user with 401 error", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: inactiveUsername,
        password,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe("ACCOUNT_INACTIVE");
    expect(data.error.message).toContain("belum aktif");
  });

  it("should return 400 when request body is missing required fields", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
