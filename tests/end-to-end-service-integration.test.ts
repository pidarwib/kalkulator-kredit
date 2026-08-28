/**
 * TASK-068 — Comprehensive Integration Tests
 *
 * Multi-layer End-to-End Service Integration Test Suite covering:
 * API Routes + Prisma Database + JWT Authentication + RBAC Scoping + Calculation Engine + Audit Trail
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginRoute } from "@/app/api/v1/auth/login/route";
import { GET as getMeRoute } from "@/app/api/v1/auth/me/route";
import { POST as calculateRoute } from "@/app/api/v1/calculations/route";
import {
  POST as createSimulationRoute,
  GET as listSimulationsRoute,
} from "@/app/api/v1/simulations/route";
import {
  GET as getSimulationDetailRoute,
  DELETE as deleteSimulationRoute,
} from "@/app/api/v1/simulations/[id]/route";
import { GET as getAuditLogsRoute } from "@/app/api/v1/audit-logs/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

const UNIQUE_TAG = `e2e_int_${Date.now()}`;
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

describe("TASK-068: Multi-Layer Service Integration Tests", { timeout: TIMEOUT_MS }, () => {
  // Test Data Fixtures
  let bprAId: string;
  let bprBId: string;
  let branchAId: string;
  let paymentOfficeAId: string;
  let productId: string;

  // Users
  let marketingUserToken: string;
  let marketingUserId: string;
  let marketingUsername: string;

  let adminBprAToken: string;
  let adminBprAId: string;

  let adminBprBToken: string;
  let adminBprBId: string;

  const createdUserIds: string[] = [];
  let createdSimulationId: string;

  beforeAll(async () => {
    // 1. Setup Tenants (BPR A & BPR B)
    const bprA = await db.bpr.create({
      data: {
        code: `BPR_A_${UNIQUE_TAG}`,
        name: `BPR Integra A ${UNIQUE_TAG}`,
        status: "ACTIVE",
      },
    });
    bprAId = bprA.id;

    const bprB = await db.bpr.create({
      data: {
        code: `BPR_B_${UNIQUE_TAG}`,
        name: `BPR Integra B ${UNIQUE_TAG}`,
        status: "ACTIVE",
      },
    });
    bprBId = bprB.id;

    // 2. Setup Branch & Payment Office for BPR A
    const branchA = await db.branch.create({
      data: {
        bprId: bprAId,
        code: `BR_A_${UNIQUE_TAG}`,
        name: "Cabang Utama A",
        address: "Jl. Sudirman 10",
        status: "ACTIVE",
      },
    });
    branchAId = branchA.id;

    const paymentOfficeA = await db.paymentOffice.create({
      data: {
        bprId: bprAId,
        branchId: branchAId,
        code: `PO_A_${UNIQUE_TAG}`,
        name: "Kantor Kas Sudirman",
        type: "POS",
        status: "ACTIVE",
      },
    });
    paymentOfficeAId = paymentOfficeA.id;

    // 3. Setup Credit Product with Parameters, Fees, and Insurance
    const product = await db.product.create({
      data: {
        bprId: bprAId,
        code: `PROD_${UNIQUE_TAG}`,
        name: `Kredit Multi Guna ${UNIQUE_TAG}`,
        status: "ACTIVE",
      },
    });
    productId = product.id;

    await db.creditParameter.create({
      data: {
        productId,
        version: "v1.0-e2e",
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
        productId,
        version: "v1.0-e2e",
        provisionRate: 0.01, // 1%
        adminRate: 0.005, // 0.5%
        verificationFee: 50_000,
        flaggingFee: 150_000,
        frontingRate: 0.05,
        reserveRate: 0.10,
        effectiveFrom: new Date("2020-01-01"),
        isActive: true,
      },
    });

    await db.insuranceRate.createMany({
      data: [
        {
          productId,
          age: 50,
          tenorYears: 5,
          premiumRate: 0.035,
          effectiveFrom: new Date("2020-01-01"),
          isActive: true,
        },
        {
          productId,
          age: 51,
          tenorYears: 5,
          premiumRate: 0.038,
          effectiveFrom: new Date("2020-01-01"),
          isActive: true,
        },
      ],
    });

    // 4. Setup Roles & Users
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    const adminRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    if (!mktRole || !adminRole) throw new Error("Roles must exist");

    marketingUsername = `mkt_${UNIQUE_TAG}`;
    const mktUser = await UserRepository.create({
      username: marketingUsername,
      password: "MarketingPassword123!",
      fullName: "Marketing User Integra",
      roleId: mktRole.id,
      bprId: bprAId,
      branchId: branchAId,
      status: "ACTIVE",
    });
    marketingUserId = mktUser.id;
    createdUserIds.push(marketingUserId);

    marketingUserToken = await signSessionToken({
      userId: marketingUserId,
      username: marketingUsername,
      fullName: mktUser.fullName,
      role: "MARKETING",
      bprId: bprAId,
      branchId: branchAId,
    });

    const adminAUser = await UserRepository.create({
      username: `admin_a_${UNIQUE_TAG}`,
      password: "AdminPassword123!",
      fullName: "Admin BPR A Integra",
      roleId: adminRole.id,
      bprId: bprAId,
      branchId: branchAId,
      status: "ACTIVE",
    });
    adminBprAId = adminAUser.id;
    createdUserIds.push(adminBprAId);

    adminBprAToken = await signSessionToken({
      userId: adminBprAId,
      username: adminAUser.username,
      fullName: adminAUser.fullName,
      role: "ADMIN",
      bprId: bprAId,
      branchId: branchAId,
    });

    const adminBUser = await UserRepository.create({
      username: `admin_b_${UNIQUE_TAG}`,
      password: "AdminPassword123!",
      fullName: "Admin BPR B Integra",
      roleId: adminRole.id,
      bprId: bprBId,
      status: "ACTIVE",
    });
    adminBprBId = adminBUser.id;
    createdUserIds.push(adminBprBId);

    adminBprBToken = await signSessionToken({
      userId: adminBprBId,
      username: adminBUser.username,
      fullName: adminBUser.fullName,
      role: "ADMIN",
      bprId: bprBId,
    });
  }, 60000);

  afterAll(async () => {
    if (createdSimulationId) {
      await db.simulation.deleteMany({ where: { id: createdSimulationId } });
    }
    if (createdUserIds.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } });
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (productId) {
      await db.calculation.deleteMany({ where: { productId } });
      await db.insuranceRate.deleteMany({ where: { productId } });
      await db.feeParameter.deleteMany({ where: { productId } });
      await db.creditParameter.deleteMany({ where: { productId } });
      await db.product.deleteMany({ where: { id: productId } });
    }
    if (paymentOfficeAId) await db.paymentOffice.deleteMany({ where: { id: paymentOfficeAId } });
    if (branchAId) await db.branch.deleteMany({ where: { id: branchAId } });
    if (bprAId) await db.bpr.deleteMany({ where: { id: bprAId } });
    if (bprBId) await db.bpr.deleteMany({ where: { id: bprBId } });
  }, 60000);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Auth & Session Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Authentication & Session Integration", () => {
    it("should login with valid credentials and return user info with session cookie", async () => {
      const req = makeRequest("POST", "/api/v1/auth/login", undefined, {
        username: marketingUsername,
        password: "MarketingPassword123!",
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.user.username).toBe(marketingUsername);
      expect(json.user.role).toBe("MARKETING");

      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain(SESSION_COOKIE_NAME);
    });

    it("should resolve /api/v1/auth/me for authenticated marketing user with full RBAC permissions", async () => {
      const req = makeRequest("GET", "/api/v1/auth/me", marketingUserToken);
      const res = await getMeRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.username).toBe(marketingUsername);
      expect(json.user.role).toBe("MARKETING");
      expect(json.user.permissions).toContain("SIMULATION_CREATE");
      expect(json.user.permissions).toContain("CREDIT_CALCULATE");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Real Database-Driven Credit Calculation Engine Integration
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Database-Driven Financial Calculation Orchestration", () => {
    it("should calculate complete credit simulation using DB parameters and insurance matrix", async () => {
      const calculationPayload = {
        productId,
        birthDate: "1976-01-01", // Age ~50-51 years
        requestedPrincipal: 50_000_000,
        tenorMonths: 60, // 5 years
        netSalary: 10_000_000,
        method: "FLAT",
        paymentOfficeId: paymentOfficeAId,
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingUserToken, calculationPayload);
      const res = await calculateRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();

      const data = json.data;
      // 1. Result verification
      expect(data.calculationMethod).toBe("FLAT");
      // Monthly installment: 50M / 60 (833.333,33) + 50M * 0.01 (500.000) = 1.333.333,33
      expect(data.result.installment).toBeCloseTo(1_333_333.33, 0);
      expect(data.breakdown.installment.principalPortion).toBeCloseTo(833_333.33, 0);
      expect(data.breakdown.installment.interestPortion).toBe(500_000);

      // 2. DBR & Eligibility verification
      // DBR = 1.333.333,33 / 10.000.000 = 13.33% <= 85%
      expect(Number(data.result.dbr)).toBeCloseTo(0.1333, 2);
      expect(data.isEligible).toBe(true);
      expect(data.status).toBe("OK");

      // 3. Insurance & Fee computation from DB
      expect(data.insurance.premium).toBeGreaterThan(0);
      expect(data.fees.provision).toBe(500_000); // 50M * 1%
      expect(data.fees.admin).toBe(250_000); // 50M * 0.5%
      expect(data.result.netDisbursement).toBeLessThan(50_000_000);

      // 4. Amortization Schedule
      expect(data.schedule).toHaveLength(60);
      expect(data.schedule[59].closingBalance).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Simulation Lifecycle & Tenant Scoping Integration
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Simulation Persistence & Tenant Scoping Lifecycle", () => {
    it("should persist formal simulation (POST /api/v1/simulations) and return 201 Created", async () => {
      const simulationPayload = {
        customerName: "Budi Santoso Integra",
        customerNip: "3171234567890001",
        productId,
        birthDate: "1976-01-01",
        requestedPrincipal: 50_000_000,
        tenorMonths: 60,
        netSalary: 10_000_000,
        method: "FLAT",
        paymentOfficeId: paymentOfficeAId,
      };

      const req = makeRequest("POST", "/api/v1/simulations", marketingUserToken, simulationPayload);
      const res = await createSimulationRoute(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.simulationId).toBeDefined();
      expect(json.data.simulationNumber).toBeDefined();
      expect(json.data.customerName).toBe("Budi Santoso Integra");

      createdSimulationId = json.data.simulationId;
    });

    it("should retrieve simulation details with full DB relation snapshots (GET /api/v1/simulations/:id)", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${createdSimulationId}`, marketingUserToken);
      const res = await getSimulationDetailRoute(req, makeRouteParams(createdSimulationId));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(createdSimulationId);
      expect(json.data.customerName).toBe("Budi Santoso Integra");
      expect(json.data.result.installment).toBeCloseTo(1_333_333.33, 0);
    });

    it("should allow Admin BPR-A to view simulations created within BPR-A", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${createdSimulationId}`, adminBprAToken);
      const res = await getSimulationDetailRoute(req, makeRouteParams(createdSimulationId));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(createdSimulationId);
    });

    it("should BLOCK Admin BPR-B from accessing BPR-A simulation (Tenant Boundary Enforcement 403)", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${createdSimulationId}`, adminBprBToken);
      const res = await getSimulationDetailRoute(req, makeRouteParams(createdSimulationId));

      expect(res.status).toBe(403);
    });

    it("should list simulations with search & status filtering for marketing owner", async () => {
      const req = makeRequest(
        "GET",
        `/api/v1/simulations?search=Budi+Santoso&status=SAVED`,
        marketingUserToken
      );
      const res = await listSimulationsRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data[0].customerName).toBe("Budi Santoso Integra");
      expect(json.meta.total).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Audit Trail Integration
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Audit Trail Recording Integration", () => {
    it("should record immutable audit log entries for simulation creation", async () => {
      // Find audit log for simulation created in previous step
      const logs = await db.auditLog.findMany({
        where: {
          entityType: "Simulation",
          entityId: createdSimulationId,
        },
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe("SIMULATION_CREATE");
      expect(logs[0].userId).toBe(marketingUserId);
    });

    it("should query audit logs via API for authorized admin with tenant scoping (GET /api/v1/audit-logs)", async () => {
      const req = makeRequest("GET", `/api/v1/audit-logs?entityType=Simulation`, adminBprAToken);
      const res = await getAuditLogsRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
