/**
 * TASK-070 — Comprehensive RBAC End-to-End Test Suite
 *
 * Validates Role-Based Access Control, Endpoint Permissions, and Data Scope Isolation
 * across Marketing, Admin (BPR Admin), and Super Admin roles according to ROLE_PERMISSION.md.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMeRoute } from "@/app/api/v1/auth/me/route";
import { POST as createBprRoute, GET as listBprsRoute } from "@/app/api/v1/bprs/route";
import { POST as createUserRoute, GET as listUsersRoute } from "@/app/api/v1/users/route";
import { POST as createProductRoute } from "@/app/api/v1/products/route";
import { GET as getAuditLogsRoute } from "@/app/api/v1/audit-logs/route";
import {
  POST as createSimulationRoute,
  GET as listSimulationsRoute,
} from "@/app/api/v1/simulations/route";
import { GET as getSimulationDetailRoute } from "@/app/api/v1/simulations/[id]/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

const UNIQUE_TAG = `rbac_e2e_${Date.now()}`;
const TIMEOUT_MS = 60_000;

// ─── Request Helpers ──────────────────────────────────────────────────────────

function makeRequest(
  method: string,
  path: string,
  token?: string,
  body?: object
): NextRequest {
  const url = `http://localhost:3000${path}`;
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

describe("TASK-070: RBAC End-to-End Permissions & Scoping", { timeout: TIMEOUT_MS }, () => {
  let bprAId: string;
  let bprBId: string;
  let branchAId: string;
  let branchBId: string;
  let productAId: string;

  // Tokens & IDs for all 3 roles + multi-tenant actors
  let superAdminToken: string;
  let superAdminId: string;

  let adminAToken: string;
  let adminAId: string;

  let adminBToken: string;
  let adminBId: string;

  let marketingA1Token: string;
  let marketingA1Id: string;

  let marketingA2Token: string;
  let marketingA2Id: string;

  let simulationA1Id: string;

  const createdUserIds: string[] = [];
  const createdBprIds: string[] = [];
  const createdSimulationIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    // 1. Setup BPR Tenants
    const bprA = await db.bpr.create({
      data: {
        code: `BPR_RBAC_A_${UNIQUE_TAG}`,
        name: `BPR RBAC Alpha ${UNIQUE_TAG}`,
        status: "ACTIVE",
      },
    });
    bprAId = bprA.id;
    createdBprIds.push(bprAId);

    const bprB = await db.bpr.create({
      data: {
        code: `BPR_RBAC_B_${UNIQUE_TAG}`,
        name: `BPR RBAC Beta ${UNIQUE_TAG}`,
        status: "ACTIVE",
      },
    });
    bprBId = bprB.id;
    createdBprIds.push(bprBId);

    // 2. Setup Branches
    const branchA = await db.branch.create({
      data: {
        bprId: bprAId,
        code: `BR_RBAC_A_${UNIQUE_TAG}`,
        name: "Cabang Alpha Utama",
        address: "Jl. Alpha No. 1",
        status: "ACTIVE",
      },
    });
    branchAId = branchA.id;

    const branchB = await db.branch.create({
      data: {
        bprId: bprBId,
        code: `BR_RBAC_B_${UNIQUE_TAG}`,
        name: "Cabang Beta Utama",
        address: "Jl. Beta No. 2",
        status: "ACTIVE",
      },
    });
    branchBId = branchB.id;

    // 3. Setup Product in BPR A
    const productA = await db.product.create({
      data: {
        bprId: bprAId,
        code: `PROD_RBAC_A_${UNIQUE_TAG}`,
        name: `Kredit Multi RBAC A ${UNIQUE_TAG}`,
        status: "ACTIVE",
      },
    });
    productAId = productA.id;
    createdProductIds.push(productAId);

    await db.creditParameter.create({
      data: {
        productId: productAId,
        version: "v1.0-rbac",
        maximumAgeYears: 75,
        maximumAgeMonths: 0,
        maximumTenorMonths: 120,
        maximumPrincipal: 200_000_000,
        maximumDbr: 0.85,
        flatAnnualRate: 0.12,
        flatMonthlyRate: 0.01,
        principalRoundingIncrement: 100_000,
        installmentDeductionPeriods: 1,
        effectiveFrom: new Date("2020-01-01"),
        isActive: true,
      },
    });

    await db.feeParameter.create({
      data: {
        productId: productAId,
        version: "v1.0-rbac",
        provisionRate: 0.01,
        adminRate: 0.005,
        verificationFee: 50_000,
        flaggingFee: 100_000,
        frontingRate: 0.05,
        reserveRate: 0.10,
        effectiveFrom: new Date("2020-01-01"),
        isActive: true,
      },
    });

    await db.insuranceRate.create({
      data: {
        productId: productAId,
        age: 50,
        tenorYears: 5,
        premiumRate: 0.035,
        effectiveFrom: new Date("2020-01-01"),
        isActive: true,
      },
    });

    // 4. Setup Roles
    const superAdminRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const adminRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });

    if (!superAdminRole || !adminRole || !mktRole) {
      throw new Error("Essential roles (SUPER_ADMIN, ADMIN, MARKETING) must exist in DB");
    }

    // 5. Create Users for all test roles
    // 5a. Super Admin
    const superAdminUser = await UserRepository.create({
      username: `sa_${UNIQUE_TAG}`,
      password: "SuperAdminPass123!",
      fullName: "Super Admin Global",
      roleId: superAdminRole.id,
      status: "ACTIVE",
    });
    superAdminId = superAdminUser.id;
    createdUserIds.push(superAdminId);
    superAdminToken = await signSessionToken({
      userId: superAdminId,
      username: superAdminUser.username,
      fullName: superAdminUser.fullName,
      role: "SUPER_ADMIN",
    });

    // 5b. Admin BPR-A
    const adminAUser = await UserRepository.create({
      username: `admin_a_${UNIQUE_TAG}`,
      password: "AdminAPassword123!",
      fullName: "Admin BPR Alpha",
      roleId: adminRole.id,
      bprId: bprAId,
      branchId: branchAId,
      status: "ACTIVE",
    });
    adminAId = adminAUser.id;
    createdUserIds.push(adminAId);
    adminAToken = await signSessionToken({
      userId: adminAId,
      username: adminAUser.username,
      fullName: adminAUser.fullName,
      role: "ADMIN",
      bprId: bprAId,
      branchId: branchAId,
    });

    // 5c. Admin BPR-B
    const adminBUser = await UserRepository.create({
      username: `admin_b_${UNIQUE_TAG}`,
      password: "AdminBPassword123!",
      fullName: "Admin BPR Beta",
      roleId: adminRole.id,
      bprId: bprBId,
      branchId: branchBId,
      status: "ACTIVE",
    });
    adminBId = adminBUser.id;
    createdUserIds.push(adminBId);
    adminBToken = await signSessionToken({
      userId: adminBId,
      username: adminBUser.username,
      fullName: adminBUser.fullName,
      role: "ADMIN",
      bprId: bprBId,
      branchId: branchBId,
    });

    // 5d. Marketing User 1 in BPR-A
    const mktA1User = await UserRepository.create({
      username: `mkt_a1_${UNIQUE_TAG}`,
      password: "MktA1Password123!",
      fullName: "Marketing Alpha 1",
      roleId: mktRole.id,
      bprId: bprAId,
      branchId: branchAId,
      status: "ACTIVE",
    });
    marketingA1Id = mktA1User.id;
    createdUserIds.push(marketingA1Id);
    marketingA1Token = await signSessionToken({
      userId: marketingA1Id,
      username: mktA1User.username,
      fullName: mktA1User.fullName,
      role: "MARKETING",
      bprId: bprAId,
      branchId: branchAId,
    });

    // 5e. Marketing User 2 in BPR-A
    const mktA2User = await UserRepository.create({
      username: `mkt_a2_${UNIQUE_TAG}`,
      password: "MktA2Password123!",
      fullName: "Marketing Alpha 2",
      roleId: mktRole.id,
      bprId: bprAId,
      branchId: branchAId,
      status: "ACTIVE",
    });
    marketingA2Id = mktA2User.id;
    createdUserIds.push(marketingA2Id);
    marketingA2Token = await signSessionToken({
      userId: marketingA2Id,
      username: mktA2User.username,
      fullName: mktA2User.fullName,
      role: "MARKETING",
      bprId: bprAId,
      branchId: branchAId,
    });

    // 6. Create Simulation by Marketing A1
    const simRes = await createSimulationRoute(
      makeRequest("POST", "/api/v1/simulations", marketingA1Token, {
        customerName: "Debitur A1 RBAC",
        customerNip: "1234567890123456",
        productId: productAId,
        birthDate: "1976-01-01",
        requestedPrincipal: 50_000_000,
        tenorMonths: 60,
        netSalary: 10_000_000,
        method: "FLAT",
      })
    );
    const simJson = await simRes.json();
    simulationA1Id = simJson.data.simulationId;
    createdSimulationIds.push(simulationA1Id);
  }, 60000);

  afterAll(async () => {
    if (createdSimulationIds.length > 0) {
      await db.simulation.deleteMany({ where: { id: { in: createdSimulationIds } } });
    }
    if (createdUserIds.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } });
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdProductIds.length > 0) {
      await db.calculation.deleteMany({ where: { productId: { in: createdProductIds } } });
      await db.insuranceRate.deleteMany({ where: { productId: { in: createdProductIds } } });
      await db.feeParameter.deleteMany({ where: { productId: { in: createdProductIds } } });
      await db.creditParameter.deleteMany({ where: { productId: { in: createdProductIds } } });
      await db.product.deleteMany({ where: { id: { in: createdProductIds } } });
    }
    if (branchAId) await db.branch.deleteMany({ where: { id: branchAId } });
    if (branchBId) await db.branch.deleteMany({ where: { id: branchBId } });
    if (createdBprIds.length > 0) {
      await db.bpr.deleteMany({ where: { id: { in: createdBprIds } } });
    }
  }, 60000);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Role Profile & Canonical Permissions Matrix Verification
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Canonical Permissions & Menu Scope Resolution (GET /api/v1/auth/me)", () => {
    it("Marketing role should have credit/simulation permissions but NO admin/master/audit permissions", async () => {
      const req = makeRequest("GET", "/api/v1/auth/me", marketingA1Token);
      const res = await getMeRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const perms = json.user.permissions;

      // Must have
      expect(perms).toContain("CREDIT_CALCULATE");
      expect(perms).toContain("CREDIT_VIEW_RESULT");
      expect(perms).toContain("SIMULATION_CREATE");
      expect(perms).toContain("SIMULATION_VIEW");

      // Must NOT have
      expect(perms).not.toContain("USER_VIEW");
      expect(perms).not.toContain("USER_CREATE");
      expect(perms).not.toContain("MASTER_CREATE");
      expect(perms).not.toContain("AUDIT_VIEW");
      expect(perms).not.toContain("ROLE_VIEW");
    });

    it("Admin role should have user management, BPR master, parameters, and audit permissions", async () => {
      const req = makeRequest("GET", "/api/v1/auth/me", adminAToken);
      const res = await getMeRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const perms = json.user.permissions;

      // Must have
      expect(perms).toContain("USER_VIEW");
      expect(perms).toContain("USER_CREATE");
      expect(perms).toContain("MASTER_VIEW");
      expect(perms).toContain("MASTER_CREATE");
      expect(perms).toContain("AUDIT_VIEW");
      expect(perms).toContain("CREDIT_PARAMETER_VIEW");
      expect(perms).toContain("CREDIT_PARAMETER_CREATE");

      // Must NOT have
      expect(perms).not.toContain("ROLE_VIEW");
      expect(perms).not.toContain("ROLE_CREATE");
      expect(perms).not.toContain("USER_DELETE");
    });

    it("Super Admin role should have all canonical global permissions", async () => {
      const req = makeRequest("GET", "/api/v1/auth/me", superAdminToken);
      const res = await getMeRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const perms = json.user.permissions;

      expect(perms).toContain("ROLE_VIEW");
      expect(perms).toContain("ROLE_CREATE");
      expect(perms).toContain("USER_DELETE");
      expect(perms).toContain("MASTER_CREATE");
      expect(perms).toContain("AUDIT_VIEW");
      expect(perms).toContain("AUDIT_EXPORT");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Endpoint Access Control (Allow vs 403 Forbidden Enforcement)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Endpoint Access Control & Permission Guard Enforcement", () => {
    it("BPR Entity Creation (POST /api/v1/bprs) - Only SUPER_ADMIN allowed, Admin & Marketing rejected (403)", async () => {
      const bprPayload = {
        code: `BPR_NEW_${Date.now()}`,
        name: "BPR Baru Test RBAC",
      };

      // 1. Marketing -> 403
      const resMkt = await createBprRoute(makeRequest("POST", "/api/v1/bprs", marketingA1Token, bprPayload));
      expect(resMkt.status).toBe(403);

      // 2. Admin -> 403 (Admin cannot create new top-level BPR tenants)
      const resAdmin = await createBprRoute(makeRequest("POST", "/api/v1/bprs", adminAToken, bprPayload));
      expect(resAdmin.status).toBe(403);

      // 3. Super Admin -> 201 Created
      const resSA = await createBprRoute(makeRequest("POST", "/api/v1/bprs", superAdminToken, bprPayload));
      expect(resSA.status).toBe(201);
      const saJson = await resSA.json();
      createdBprIds.push(saJson.data.id);
    });

    it("User Management (GET /api/v1/users) - Denied for Marketing (403), Allowed for Admin (200) and Super Admin (200)", async () => {
      // 1. Marketing -> 403
      const resMkt = await listUsersRoute(makeRequest("GET", "/api/v1/users", marketingA1Token));
      expect(resMkt.status).toBe(403);

      // 2. Admin -> 200
      const resAdmin = await listUsersRoute(makeRequest("GET", "/api/v1/users", adminAToken));
      expect(resAdmin.status).toBe(200);

      // 3. Super Admin -> 200
      const resSA = await listUsersRoute(makeRequest("GET", "/api/v1/users", superAdminToken));
      expect(resSA.status).toBe(200);
    });

    it("Audit Logs API (GET /api/v1/audit-logs) - Denied for Marketing (403), Allowed for Admin (200) and Super Admin (200)", async () => {
      // 1. Marketing -> 403
      const resMkt = await getAuditLogsRoute(makeRequest("GET", "/api/v1/audit-logs", marketingA1Token));
      expect(resMkt.status).toBe(403);

      // 2. Admin -> 200
      const resAdmin = await getAuditLogsRoute(makeRequest("GET", "/api/v1/audit-logs", adminAToken));
      expect(resAdmin.status).toBe(200);

      // 3. Super Admin -> 200
      const resSA = await getAuditLogsRoute(makeRequest("GET", "/api/v1/audit-logs", superAdminToken));
      expect(resSA.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Multi-Tenant Data Scope & Ownership Isolation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Data Scope & Ownership Isolation Across Roles", () => {
    it("Admin BPR-A cannot see users from BPR-B in user list", async () => {
      const resAdminA = await listUsersRoute(makeRequest("GET", "/api/v1/users", adminAToken));
      expect(resAdminA.status).toBe(200);

      const jsonA = await resAdminA.json();
      const userIdsA = jsonA.data.map((u: { id: string }) => u.id);

      // Must see BPR-A users
      expect(userIdsA).toContain(marketingA1Id);
      expect(userIdsA).toContain(adminAId);

      // Must NOT see BPR-B users
      expect(userIdsA).not.toContain(adminBId);
    });

    it("Admin BPR-A cannot view simulations from BPR-B (403 Forbidden)", async () => {
      // Admin BPR-B trying to access simulation created in BPR-A
      const req = makeRequest("GET", `/api/v1/simulations/${simulationA1Id}`, adminBToken);
      const res = await getSimulationDetailRoute(req, makeRouteParams(simulationA1Id));

      expect(res.status).toBe(403);
    });

    it("Marketing A2 cannot access Marketing A1's simulation if ownership isolation applies", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${simulationA1Id}`, marketingA2Token);
      const res = await getSimulationDetailRoute(req, makeRouteParams(simulationA1Id));

      // Marketing user can only view their own simulations
      expect(res.status).toBe(403);
    });

    it("Super Admin can view simulations across all BPRs without restriction", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${simulationA1Id}`, superAdminToken);
      const res = await getSimulationDetailRoute(req, makeRouteParams(simulationA1Id));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(simulationA1Id);
    });
  });
});
