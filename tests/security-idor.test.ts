/**
 * TASK-062 — IDOR (Insecure Direct Object Reference) Security Tests
 *
 * Verifies that the API correctly denies cross-user and cross-BPR data access.
 *
 * Security Policy (SECURITY.md / ROLE_PERMISSION.md):
 * - MARKETING can ONLY access simulations they created (createdBy = user.id)
 * - ADMIN can ONLY access simulations within their assigned BPR
 * - SUPER_ADMIN has unrestricted global scope
 * - ADMIN cannot access SUPER_ADMIN user profiles
 * - Marketing without USER_VIEW cannot access User Management endpoints
 * - Unauthenticated requests → 401
 * - Out-of-scope resource access → 403
 * - Non-existent resource → 404
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSimulationDetail, DELETE as deleteSimulation } from "@/app/api/v1/simulations/[id]/route";
import { GET as getUser } from "@/app/api/v1/users/[id]/route";
import { GET as getAuditLogs } from "@/app/api/v1/audit-logs/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

const UNIQUE_TAG = `idor_${Date.now()}`;
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

describe("TASK-062: IDOR Security Tests", { timeout: TIMEOUT_MS }, () => {
  let superAdminToken: string;
  let adminBprAToken: string;
  let adminBprBToken: string;
  let marketingAToken: string;
  let marketingBToken: string;

  let superAdminId: string;
  let adminBprAId: string;
  let marketingAId: string;
  let marketingBId: string;

  let bprAId: string;
  let bprBId: string;
  let productAId: string;
  let productBId: string;

  let marketingASimId: string;
  let marketingBSimId: string;
  let bprBSimId: string;

  const createdUserIds: string[] = [];
  const createdSimulationIds: string[] = [];
  const createdBprIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch roles
    const superAdminRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const adminRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!superAdminRole || !adminRole || !mktRole) {
      throw new Error("Seeded roles SUPER_ADMIN, ADMIN, MARKETING must exist.");
    }

    // 2. Find or create BPR-A (Madiun)
    let bprA = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    if (!bprA) throw new Error("Seeded BPR_KOTA_MADIUN must exist.");
    bprAId = bprA.id;

    // 3. Find or create BPR-B (for cross-BPR tests)
    let bprB = await db.bpr.findUnique({ where: { code: `BPR_IDOR_B_${UNIQUE_TAG}` } });
    if (!bprB) {
      bprB = await db.bpr.create({
        data: {
          code: `BPR_IDOR_B_${UNIQUE_TAG}`,
          name: `BPR IDOR Test B (${UNIQUE_TAG})`,
        },
      });
    }
    bprBId = bprB.id;
    createdBprIds.push(bprBId);

    // 4. Find or create Product for BPR-A
    let productA = await db.product.findFirst({ where: { bprId: bprAId, status: "ACTIVE" } });
    if (!productA) throw new Error("BPR_KOTA_MADIUN must have at least one active product.");
    productAId = productA.id;

    // 5. Create Product for BPR-B
    const productBCode = `PROD_IDOR_B_${UNIQUE_TAG}`;
    let productB = await db.product.findUnique({
      where: { bprId_code: { bprId: bprBId, code: productBCode } },
    });
    if (!productB) {
      productB = await db.product.create({
        data: {
          bprId: bprBId,
          code: productBCode,
          name: `Product IDOR Test B (${UNIQUE_TAG})`,
          status: "ACTIVE",
        },
      });
    }
    productBId = productB.id;

    // 6. Create Super Admin
    const superAdminUser = await UserRepository.create({
      username: `sa_idor_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Super Admin IDOR Test",
      roleId: superAdminRole.id,
    });
    superAdminId = superAdminUser.id;
    createdUserIds.push(superAdminId);
    superAdminToken = await signSessionToken({
      userId: superAdminId,
      username: superAdminUser.username,
      fullName: superAdminUser.fullName,
      role: superAdminRole.code,
    });

    // 7. Create Admin BPR-A
    const adminBprAUser = await UserRepository.create({
      username: `admin_idor_a_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Admin BPR-A IDOR",
      roleId: adminRole.id,
      bprId: bprAId,
    });
    adminBprAId = adminBprAUser.id;
    createdUserIds.push(adminBprAId);
    adminBprAToken = await signSessionToken({
      userId: adminBprAId,
      username: adminBprAUser.username,
      fullName: adminBprAUser.fullName,
      role: adminRole.code,
      bprId: bprAId,
    });

    // 8. Create Admin BPR-B
    const adminBprBUser = await UserRepository.create({
      username: `admin_idor_b_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Admin BPR-B IDOR",
      roleId: adminRole.id,
      bprId: bprBId,
    });
    createdUserIds.push(adminBprBUser.id);
    adminBprBToken = await signSessionToken({
      userId: adminBprBUser.id,
      username: adminBprBUser.username,
      fullName: adminBprBUser.fullName,
      role: adminRole.code,
      bprId: bprBId,
    });

    // 9. Create Marketing A (in BPR-A)
    const mktA = await UserRepository.create({
      username: `mkt_idor_a_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Marketing A IDOR",
      roleId: mktRole.id,
      bprId: bprAId,
    });
    marketingAId = mktA.id;
    createdUserIds.push(marketingAId);
    marketingAToken = await signSessionToken({
      userId: marketingAId,
      username: mktA.username,
      fullName: mktA.fullName,
      role: mktRole.code,
      bprId: bprAId,
    });

    // 10. Create Marketing B (in BPR-A — same BPR, different user)
    const mktB = await UserRepository.create({
      username: `mkt_idor_b_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Marketing B IDOR",
      roleId: mktRole.id,
      bprId: bprAId,
    });
    marketingBId = mktB.id;
    createdUserIds.push(marketingBId);
    marketingBToken = await signSessionToken({
      userId: marketingBId,
      username: mktB.username,
      fullName: mktB.fullName,
      role: mktRole.code,
      bprId: bprAId,
    });

    // 11. Create Simulation owned by Marketing A (in BPR-A)
    const simA = await db.simulation.create({
      data: {
        simulationNumber: `SIM-IDOR-A-${Date.now()}`,
        createdBy: marketingAId,
        bprId: bprAId,
        productId: productAId,
        customerName: "Nasabah IDOR Test A",
        customerNip: "198501012010011001",
        calculationMethod: "FLAT",
        businessRuleVersion: "BR-1.0",
        parameterVersion: "v1.0",
        inputSnapshot: { requestedPrincipal: 50000000, tenorMonths: 60 },
        resultSnapshot: { result: { installment: 1250000 } },
        status: "SAVED",
      },
    });
    marketingASimId = simA.id;
    createdSimulationIds.push(marketingASimId);

    // 12. Create Simulation owned by Marketing B (in BPR-A — same BPR as A)
    const simB = await db.simulation.create({
      data: {
        simulationNumber: `SIM-IDOR-B-${Date.now()}`,
        createdBy: marketingBId,
        bprId: bprAId,
        productId: productAId,
        customerName: "Nasabah IDOR Test B",
        customerNip: "199006152015022002",
        calculationMethod: "FLAT",
        businessRuleVersion: "BR-1.0",
        parameterVersion: "v1.0",
        inputSnapshot: { requestedPrincipal: 40000000, tenorMonths: 48 },
        resultSnapshot: { result: { installment: 1100000 } },
        status: "SAVED",
      },
    });
    marketingBSimId = simB.id;
    createdSimulationIds.push(marketingBSimId);

    // 13. Create Simulation in BPR-B (different tenant from BPR-A)
    const simBprB = await db.simulation.create({
      data: {
        simulationNumber: `SIM-IDOR-BPR-B-${Date.now()}`,
        createdBy: adminBprBUser.id,
        bprId: bprBId,
        productId: productBId,
        customerName: "Nasabah IDOR BPR-B",
        customerNip: "198003202005011003",
        calculationMethod: "FLAT",
        businessRuleVersion: "BR-1.0",
        parameterVersion: "v1.0",
        inputSnapshot: { requestedPrincipal: 75000000, tenorMonths: 72 },
        resultSnapshot: { result: { installment: 1750000 } },
        status: "SAVED",
      },
    });
    bprBSimId = simBprB.id;
    createdSimulationIds.push(bprBSimId);
  }, 60000);

  afterAll(async () => {
    // Delete simulations
    if (createdSimulationIds.length > 0) {
      await db.simulation.deleteMany({ where: { id: { in: createdSimulationIds } } });
    }
    // Delete users
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
  // GROUP 1: Unauthenticated Access Control → 401
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Unauthenticated Access Control", () => {
    it("should return 401 when accessing simulation detail without token", async () => {
      const simId = "any-simulation-id-xyz";
      const req = makeRequest("GET", `/api/v1/simulations/${simId}`);
      const res = await getSimulationDetail(req, makeRouteParams(simId));

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error?.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when accessing user profile without token", async () => {
      const userId = "any-user-id-xyz";
      const req = makeRequest("GET", `/api/v1/users/${userId}`);
      const res = await getUser(req, makeRouteParams(userId));

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error?.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when accessing audit logs without token", async () => {
      const req = makeRequest("GET", "/api/v1/audit-logs");
      const res = await getAuditLogs(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error?.code).toBe("UNAUTHORIZED");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 2: IDOR — Marketing A → Simulation owned by Marketing B
  // Expected: 403 Forbidden (same BPR, different user = OWN scope violation)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("IDOR: Marketing A cannot access Simulation B (same BPR, different user)", () => {
    it("should return 403 when Marketing A tries to GET simulation owned by Marketing B", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${marketingBSimId}`, marketingAToken);
      const res = await getSimulationDetail(req, makeRouteParams(marketingBSimId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should return 403 when Marketing B tries to GET simulation owned by Marketing A", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${marketingASimId}`, marketingBToken);
      const res = await getSimulationDetail(req, makeRouteParams(marketingASimId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should return 403 when Marketing A tries to DELETE simulation owned by Marketing B", async () => {
      const req = makeRequest("DELETE", `/api/v1/simulations/${marketingBSimId}`, marketingAToken);
      const res = await deleteSimulation(req, makeRouteParams(marketingBSimId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should allow Marketing A to GET their own simulation (positive control)", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${marketingASimId}`, marketingAToken);
      const res = await getSimulationDetail(req, makeRouteParams(marketingASimId));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data?.id).toBe(marketingASimId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 3: IDOR — Admin BPR-A → Simulation in BPR-B
  // Expected: 403 Forbidden (cross-BPR = tenant isolation violation)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("IDOR: Admin BPR-A cannot access Simulation in BPR-B (cross-tenant)", () => {
    it("should return 403 when Admin BPR-A tries to GET simulation from BPR-B", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${bprBSimId}`, adminBprAToken);
      const res = await getSimulationDetail(req, makeRouteParams(bprBSimId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should return 403 when Admin BPR-B tries to GET simulation from BPR-A", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${marketingASimId}`, adminBprBToken);
      const res = await getSimulationDetail(req, makeRouteParams(marketingASimId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should allow Admin BPR-A to GET simulation owned by Marketing A (same BPR, positive control)", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${marketingASimId}`, adminBprAToken);
      const res = await getSimulationDetail(req, makeRouteParams(marketingASimId));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data?.id).toBe(marketingASimId);
    });

    it("should allow Super Admin to GET any simulation across BPRs (positive control)", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${bprBSimId}`, superAdminToken);
      const res = await getSimulationDetail(req, makeRouteParams(bprBSimId));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data?.id).toBe(bprBSimId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 4: IDOR — User Management Access
  // ═══════════════════════════════════════════════════════════════════════════

  describe("IDOR: User Management Access Control", () => {
    it("should return 403 when Marketing A tries to GET Marketing B profile (lacks USER_VIEW)", async () => {
      const req = makeRequest("GET", `/api/v1/users/${marketingBId}`, marketingAToken);
      const res = await getUser(req, makeRouteParams(marketingBId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should return 403 when Admin BPR-A tries to GET Super Admin profile (hierarchical IDOR)", async () => {
      const req = makeRequest("GET", `/api/v1/users/${superAdminId}`, adminBprAToken);
      const res = await getUser(req, makeRouteParams(superAdminId));

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should allow Admin BPR-A to GET Marketing A profile (same BPR, positive control)", async () => {
      const req = makeRequest("GET", `/api/v1/users/${marketingAId}`, adminBprAToken);
      const res = await getUser(req, makeRouteParams(marketingAId));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data?.id).toBe(marketingAId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 5: Permission Boundary — Audit Log Access
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Permission Boundary: Audit Log Access Control", () => {
    it("should return 403 when Marketing user (no AUDIT_VIEW) tries to access audit logs", async () => {
      const req = makeRequest("GET", "/api/v1/audit-logs", marketingAToken);
      const res = await getAuditLogs(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("FORBIDDEN");
    });

    it("should allow Admin BPR-A to access audit logs (has AUDIT_VIEW)", async () => {
      const req = makeRequest("GET", "/api/v1/audit-logs?pageSize=1", adminBprAToken);
      const res = await getAuditLogs(req);

      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 6: Non-existent Resource → 404
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Non-existent Resource Access", () => {
    it("should return 404 when accessing a simulation with a non-existent UUID", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const req = makeRequest("GET", `/api/v1/simulations/${nonExistentId}`, marketingAToken);
      const res = await getSimulationDetail(req, makeRouteParams(nonExistentId));

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error?.code).toBe("SIMULATION_NOT_FOUND");
    });

    it("should return 404 when accessing a user with a non-existent UUID", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000001";
      const req = makeRequest("GET", `/api/v1/users/${nonExistentId}`, adminBprAToken);
      const res = await getUser(req, makeRouteParams(nonExistentId));

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error?.code).toBe("NOT_FOUND");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 7: Unit Tests for DataScopeService (pure logic)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("DataScopeService.canAccessSimulation() unit logic", () => {
    const makeUser = (role: string, id: string, bprId?: string | null, branchId?: string | null) => ({
      id,
      username: `user_${id}`,
      fullName: "Test User",
      email: null,
      role,
      roleId: `role_${role}`,
      bprId: bprId ?? null,
      branchId: branchId ?? null,
      permissions: [],
      scope: role === "SUPER_ADMIN" ? "ALL" as const : role === "ADMIN" ? "BRANCH" as const : "OWN" as const,
    });

    const makeSimulation = (createdBy: string, bprId?: string | null, branchId?: string | null) => ({
      createdBy,
      bprId: bprId ?? null,
      branchId: branchId ?? null,
    });

    it("Marketing can access their own simulation", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const user = makeUser("MARKETING", "mkt-1", "bpr-1");
      const sim = makeSimulation("mkt-1", "bpr-1");
      expect(DataScopeService.canAccessSimulation(user, sim)).toBe(true);
    });

    it("Marketing CANNOT access another user's simulation (IDOR block)", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const user = makeUser("MARKETING", "mkt-1", "bpr-1");
      const sim = makeSimulation("mkt-2", "bpr-1");
      expect(DataScopeService.canAccessSimulation(user, sim)).toBe(false);
    });

    it("Admin can access simulation in their BPR", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const user = makeUser("ADMIN", "admin-1", "bpr-1");
      const sim = makeSimulation("mkt-x", "bpr-1");
      expect(DataScopeService.canAccessSimulation(user, sim)).toBe(true);
    });

    it("Admin CANNOT access simulation in a different BPR (IDOR block)", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const user = makeUser("ADMIN", "admin-1", "bpr-1");
      const sim = makeSimulation("mkt-x", "bpr-2");
      expect(DataScopeService.canAccessSimulation(user, sim)).toBe(false);
    });

    it("Super Admin can access ANY simulation regardless of BPR", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const user = makeUser("SUPER_ADMIN", "sa-1", null);
      const sim = makeSimulation("mkt-x", "bpr-99");
      expect(DataScopeService.canAccessSimulation(user, sim)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 8: Unit Tests for DataScopeService.canAccessUser() (pure logic)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("DataScopeService.canAccessUser() unit logic", () => {
    const makeUser = (role: string, id: string, bprId?: string | null, branchId?: string | null) => ({
      id,
      username: `user_${id}`,
      fullName: "Test User",
      email: null,
      role,
      roleId: `role_${role}`,
      bprId: bprId ?? null,
      branchId: branchId ?? null,
      permissions: [],
      scope: role === "SUPER_ADMIN" ? "ALL" as const : role === "ADMIN" ? "BRANCH" as const : "OWN" as const,
    });

    it("Marketing can only access their own user record", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const caller = makeUser("MARKETING", "mkt-1", "bpr-1");
      expect(DataScopeService.canAccessUser(caller, { id: "mkt-1", bprId: "bpr-1" })).toBe(true);
      expect(DataScopeService.canAccessUser(caller, { id: "mkt-2", bprId: "bpr-1" })).toBe(false);
    });

    it("Admin cannot access SUPER_ADMIN user record", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const admin = makeUser("ADMIN", "admin-1", "bpr-1");
      const saTarget = { id: "sa-1", bprId: null, roleCode: "SUPER_ADMIN" };
      expect(DataScopeService.canAccessUser(admin, saTarget)).toBe(false);
    });

    it("Admin can access marketing user in same BPR", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const admin = makeUser("ADMIN", "admin-1", "bpr-1");
      expect(DataScopeService.canAccessUser(admin, { id: "mkt-x", bprId: "bpr-1" })).toBe(true);
    });

    it("Admin CANNOT access user in different BPR (IDOR block)", async () => {
      const { DataScopeService } = await import("@/lib/rbac");
      const admin = makeUser("ADMIN", "admin-1", "bpr-1");
      expect(DataScopeService.canAccessUser(admin, { id: "mkt-x", bprId: "bpr-2" })).toBe(false);
    });
  });
});
