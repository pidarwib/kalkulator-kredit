/**
 * TASK-063 — Privilege Escalation Security Tests
 *
 * Verifies that the system strictly prevents vertical and horizontal privilege escalation:
 * - Malicious requests attempting to inject `role: "SUPER_ADMIN"` or `roleCode: "SUPER_ADMIN"`
 * - Non-Super Admin attempting self-escalation or elevating other users
 * - Tenant scope escape (changing or nullifying bprId)
 * - Cryptographic session token tampering (invalid signatures, unsigned tokens)
 * - Permission and role tampering
 *
 * Expected: STRICT DENIAL (401 / 403) across all vectors.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { POST as createUser } from "@/app/api/v1/users/route";
import { PATCH as updateUser } from "@/app/api/v1/users/[id]/route";
import { POST as createCalculation } from "@/app/api/v1/calculations/route";
import { POST as createSimulation } from "@/app/api/v1/simulations/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

const UNIQUE_TAG = `privesc_${Date.now()}`;
const TIMEOUT_MS = 60_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  method: string,
  path: string,
  token?: string,
  body?: object
): NextRequest {
  const url = `http://localhost${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeRouteParams(id: string) {
  return { params: { id } };
}

// ─── Test Suite ────────────────────────────────────────────────────────────────

describe("TASK-063: Privilege Escalation Security Tests", { timeout: TIMEOUT_MS }, () => {
  let superAdminRole: { id: string; code: string };
  let adminRole: { id: string; code: string };
  let marketingRole: { id: string; code: string };

  let bprAId: string;
  let bprBId: string;
  let productBId: string;

  let superAdminId: string;
  let adminBprAId: string;
  let marketingAId: string;

  let superAdminToken: string;
  let adminBprAToken: string;
  let marketingAToken: string;

  const createdUserIds: string[] = [];
  const createdBprIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch system roles
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!saRole || !admRole || !mktRole) {
      throw new Error("Seeded roles SUPER_ADMIN, ADMIN, MARKETING must exist.");
    }
    superAdminRole = saRole;
    adminRole = admRole;
    marketingRole = mktRole;

    // 2. Fetch seeded BPR-A and create isolated BPR-B
    const bprA = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    if (!bprA) throw new Error("Seeded BPR_KOTA_MADIUN must exist.");
    bprAId = bprA.id;

    const bprB = await db.bpr.create({
      data: {
        code: `BPR_PRIVESC_B_${UNIQUE_TAG}`,
        name: `BPR PrivEsc Test B (${UNIQUE_TAG})`,
      },
    });
    bprBId = bprB.id;
    createdBprIds.push(bprBId);

    // Create product in BPR-B
    const productB = await db.product.create({
      data: {
        bprId: bprBId,
        code: `PROD_PRIVESC_B_${UNIQUE_TAG}`,
        name: "Product B PrivEsc Test",
        status: "ACTIVE",
      },
    });
    productBId = productB.id;

    // 3. Create Super Admin user
    const saUser = await UserRepository.create({
      username: `sa_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Super Admin PrivEsc",
      roleId: superAdminRole.id,
    });
    superAdminId = saUser.id;
    createdUserIds.push(superAdminId);
    superAdminToken = await signSessionToken({
      userId: superAdminId,
      username: saUser.username,
      fullName: saUser.fullName,
      role: superAdminRole.code,
    });

    // 4. Create Admin user in BPR-A
    const admUser = await UserRepository.create({
      username: `admin_a_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Admin A PrivEsc",
      roleId: adminRole.id,
      bprId: bprAId,
    });
    adminBprAId = admUser.id;
    createdUserIds.push(adminBprAId);
    adminBprAToken = await signSessionToken({
      userId: adminBprAId,
      username: admUser.username,
      fullName: admUser.fullName,
      role: adminRole.code,
      bprId: bprAId,
    });

    // 5. Create Marketing user in BPR-A
    const mktUser = await UserRepository.create({
      username: `mkt_a_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Marketing A PrivEsc",
      roleId: marketingRole.id,
      bprId: bprAId,
    });
    marketingAId = mktUser.id;
    createdUserIds.push(marketingAId);
    marketingAToken = await signSessionToken({
      userId: marketingAId,
      username: mktUser.username,
      fullName: mktUser.fullName,
      role: marketingRole.code,
      bprId: bprAId,
    });
  }, 60000);

  afterAll(async () => {
    // Delete test users
    if (createdUserIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    // Delete BPR-B products and BPR-B
    await db.product.deleteMany({ where: { bprId: { in: createdBprIds } } });
    if (createdBprIds.length > 0) {
      await db.bpr.deleteMany({ where: { id: { in: createdBprIds } } });
    }
  }, 60000);

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR 1: Vertical Escalation via User Creation (POST /api/v1/users)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Vector 1: User Creation Role Escalation Injection", () => {
    it("should DENY (403) when Admin attempts to create a SUPER_ADMIN user via roleCode", async () => {
      const maliciousBody = {
        username: `hacker_sa_1_${UNIQUE_TAG}`,
        password: "Password123!",
        fullName: "Malicious Super Admin",
        roleCode: "SUPER_ADMIN",
        bprId: bprAId,
      };

      const req = makeRequest("POST", "/api/v1/users", adminBprAToken, maliciousBody);
      const res = await createUser(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should DENY (403) when Admin attempts to create a SUPER_ADMIN user via roleId", async () => {
      const maliciousBody = {
        username: `hacker_sa_2_${UNIQUE_TAG}`,
        password: "Password123!",
        fullName: "Malicious Super Admin via ID",
        roleId: superAdminRole.id,
        bprId: bprAId,
      };

      const req = makeRequest("POST", "/api/v1/users", adminBprAToken, maliciousBody);
      const res = await createUser(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should DENY (403) when Admin attempts to create an ADMIN user (Admin can only create MARKETING)", async () => {
      const maliciousBody = {
        username: `hacker_adm_1_${UNIQUE_TAG}`,
        password: "Password123!",
        fullName: "Malicious Peer Admin",
        roleCode: "ADMIN",
        bprId: bprAId,
      };

      const req = makeRequest("POST", "/api/v1/users", adminBprAToken, maliciousBody);
      const res = await createUser(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should DENY (403) when Marketing user attempts to create any user", async () => {
      const maliciousBody = {
        username: `mkt_created_${UNIQUE_TAG}`,
        password: "Password123!",
        fullName: "Marketing Created User",
        roleCode: "MARKETING",
        bprId: bprAId,
      };

      const req = makeRequest("POST", "/api/v1/users", marketingAToken, maliciousBody);
      const res = await createUser(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should DENY (401) when Unauthenticated caller attempts to create user with SUPER_ADMIN role", async () => {
      const maliciousBody = {
        username: `unauth_sa_${UNIQUE_TAG}`,
        password: "Password123!",
        fullName: "Unauth Super Admin",
        roleCode: "SUPER_ADMIN",
      };

      const req = makeRequest("POST", "/api/v1/users", undefined, maliciousBody);
      const res = await createUser(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error?.code).toBe("UNAUTHORIZED");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR 2: Vertical Escalation via User Update (PATCH /api/v1/users/:id)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Vector 2: User Role Self-Elevation and Elevation of Others", () => {
    it("should DENY (403) when Admin attempts to elevate own account to SUPER_ADMIN", async () => {
      const maliciousBody = {
        roleId: superAdminRole.id,
      };

      const req = makeRequest("PATCH", `/api/v1/users/${adminBprAId}`, adminBprAToken, maliciousBody);
      const res = await updateUser(req, makeRouteParams(adminBprAId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");

      // Verify in DB that role was NOT changed
      const freshUser = await db.user.findUnique({
        where: { id: adminBprAId },
        include: { role: true },
      });
      expect(freshUser?.role.code).toBe("ADMIN");
    });

    it("should DENY (403) when Admin attempts to elevate Marketing user to SUPER_ADMIN", async () => {
      const maliciousBody = {
        roleId: superAdminRole.id,
      };

      const req = makeRequest("PATCH", `/api/v1/users/${marketingAId}`, adminBprAToken, maliciousBody);
      const res = await updateUser(req, makeRouteParams(marketingAId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");

      // Verify in DB that role was NOT changed
      const freshUser = await db.user.findUnique({
        where: { id: marketingAId },
        include: { role: true },
      });
      expect(freshUser?.role.code).toBe("MARKETING");
    });

    it("should DENY (403) when Marketing user attempts to update own user record (lacks USER_UPDATE)", async () => {
      const maliciousBody = {
        roleId: superAdminRole.id,
      };

      const req = makeRequest("PATCH", `/api/v1/users/${marketingAId}`, marketingAToken, maliciousBody);
      const res = await updateUser(req, makeRouteParams(marketingAId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR 3: Tenant Scope Escalation (Tampering bprId)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Vector 3: Tenant Scope Escalation", () => {
    it("should DENY (403) when Admin attempts to assign a new user to another BPR", async () => {
      const maliciousBody = {
        username: `cross_tenant_mkt_${UNIQUE_TAG}`,
        password: "Password123!",
        fullName: "Cross Tenant Marketing",
        roleCode: "MARKETING",
        bprId: bprBId, // Admin A trying to create user in BPR B
      };

      const req = makeRequest("POST", "/api/v1/users", adminBprAToken, maliciousBody);
      const res = await createUser(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should DENY (403) when Admin attempts to change Marketing user's bprId to another BPR", async () => {
      const maliciousBody = {
        bprId: bprBId,
      };

      const req = makeRequest("PATCH", `/api/v1/users/${marketingAId}`, adminBprAToken, maliciousBody);
      const res = await updateUser(req, makeRouteParams(marketingAId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");

      // Verify DB bprId unchanged
      const freshUser = await db.user.findUnique({ where: { id: marketingAId } });
      expect(freshUser?.bprId).toBe(bprAId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR 4: Cryptographic JWT Session Token Forgery & Tampering
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Vector 4: JWT Session Forgery & Signature Tampering", () => {
    it("should DENY (401) when attacker presents JWT signed with an invalid/fake secret", async () => {
      const fakeSecret = Uint8Array.from(Buffer.from("wrong_signing_secret_1234567890!", "utf-8"));
      const forgedToken = await new SignJWT({
        userId: marketingAId,
        username: "mkt_a",
        fullName: "Attacker",
        role: "SUPER_ADMIN", // Malicious elevation in JWT payload
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(fakeSecret);

      const req = makeRequest("GET", "/api/v1/audit-logs", forgedToken);
      const { GET: getAuditLogs } = await import("@/app/api/v1/audit-logs/route");
      const res = await getAuditLogs(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error?.code).toBe("UNAUTHORIZED");
    });

    it("should DENY (401) when attacker presents an unsigned / none-algorithm JWT", async () => {
      // Unsigned token: header.payload.empty_signature
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({
          userId: marketingAId,
          username: "mkt_a",
          role: "SUPER_ADMIN",
        })
      ).toString("base64url");
      const noneToken = `${header}.${payload}.`;

      const req = makeRequest("GET", "/api/v1/audit-logs", noneToken);
      const { GET: getAuditLogs } = await import("@/app/api/v1/audit-logs/route");
      const res = await getAuditLogs(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error?.code).toBe("UNAUTHORIZED");
    });

    it("should DENY (401) when token userId does not exist in database", async () => {
      const ghostToken = await signSessionToken({
        userId: "00000000-0000-0000-0000-000000000099",
        username: "ghost_user",
        fullName: "Ghost User",
        role: "SUPER_ADMIN",
      });

      const req = makeRequest("GET", "/api/v1/audit-logs", ghostToken);
      const { GET: getAuditLogs } = await import("@/app/api/v1/audit-logs/route");
      const res = await getAuditLogs(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error?.code).toBe("UNAUTHORIZED");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR 5: Self-Escalation via Calculation / Simulation Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Vector 5: Parameter & Header Injection in Operational Endpoints", () => {
    it("should DENY (403) when Marketing attempts to calculate for a product belonging to another BPR (even if injecting role: SUPER_ADMIN in body)", async () => {
      const maliciousBody = {
        productId: productBId, // Belongs to BPR-B, caller is in BPR-A
        role: "SUPER_ADMIN",   // Injected property
        userRole: "SUPER_ADMIN",
        birthDate: "1985-01-01",
        netSalary: 5000000,
        requestedPrincipal: 50000000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingAToken, maliciousBody);
      const res = await createCalculation(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should DENY (422/403) when Marketing attempts to create formal simulation for another BPR's product", async () => {
      const maliciousBody = {
        productId: productBId, // Belongs to BPR-B
        role: "SUPER_ADMIN",
        customerName: "Target Customer",
        customerNip: "198501012010011001",
        birthDate: "1985-01-01",
        netSalary: 5000000,
        requestedPrincipal: 50000000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
        status: "SAVED",
      };

      const req = makeRequest("POST", "/api/v1/simulations", marketingAToken, maliciousBody);
      const res = await createSimulation(req);

      expect([403, 422]).toContain(res.status);
    });
  });
});
