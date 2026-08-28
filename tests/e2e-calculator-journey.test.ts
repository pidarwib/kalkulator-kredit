/**
 * TASK-069 — Comprehensive End-to-End User Journey Tests
 *
 * Full E2E Journey Testing for Credit Calculator:
 * Login -> Open Calculator -> Input -> FLAT Method -> Calculate -> View Result -> Save Simulation -> View Detail
 * Followed by complete cycle repetition with ANNUITY Method.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginRoute } from "@/app/api/v1/auth/login/route";
import { GET as getMeRoute } from "@/app/api/v1/auth/me/route";
import { GET as getProductsRoute } from "@/app/api/v1/products/route";
import { POST as calculateRoute } from "@/app/api/v1/calculations/route";
import {
  POST as createSimulationRoute,
  GET as listSimulationsRoute,
} from "@/app/api/v1/simulations/route";
import { GET as getSimulationDetailRoute } from "@/app/api/v1/simulations/[id]/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

const UNIQUE_TAG = `e2e_journey_${Date.now()}`;
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

describe("TASK-069: End-to-End Credit Calculator User Journeys", { timeout: TIMEOUT_MS }, () => {
  let bprId: string;
  let branchId: string;
  let paymentOfficeId: string;
  let flatProductId: string;
  let annuityProductId: string;

  let marketingUserToken: string;
  let marketingUserId: string;
  let marketingUsername: string;
  const password = "MarketingPassword123!";

  const createdSimulationIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    // 1. Setup Tenant BPR, Branch, Payment Office
    const bpr = await db.bpr.create({
      data: {
        code: `BPR_E2E_${UNIQUE_TAG}`,
        name: `BPR Sejahtera E2E ${UNIQUE_TAG}`,
        status: "ACTIVE",
      },
    });
    bprId = bpr.id;

    const branch = await db.branch.create({
      data: {
        bprId,
        code: `BR_E2E_${UNIQUE_TAG}`,
        name: "Cabang Thamrin E2E",
        address: "Jl. MH Thamrin No. 45",
        status: "ACTIVE",
      },
    });
    branchId = branch.id;

    const paymentOffice = await db.paymentOffice.create({
      data: {
        bprId,
        branchId,
        code: `PO_E2E_${UNIQUE_TAG}`,
        name: "Kantor Kas Thamrin",
        type: "POS",
        status: "ACTIVE",
      },
    });
    paymentOfficeId = paymentOffice.id;

    // 2. Setup Flat Product with Parameters, Fees, Insurance
    const flatProduct = await db.product.create({
      data: {
        bprId,
        code: `PROD_FLAT_${UNIQUE_TAG}`,
        name: `Kredit Multiguna Flat (${UNIQUE_TAG})`,
        status: "ACTIVE",
      },
    });
    flatProductId = flatProduct.id;
    createdProductIds.push(flatProductId);

    await db.creditParameter.create({
      data: {
        productId: flatProductId,
        version: "v1.0-flat",
        maximumAgeYears: 75,
        maximumAgeMonths: 0,
        maximumTenorMonths: 120,
        maximumPrincipal: 250_000_000,
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
        productId: flatProductId,
        version: "v1.0-flat",
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

    // 3. Setup Annuity Product with Parameters, Fees, Insurance
    const annuityProduct = await db.product.create({
      data: {
        bprId,
        code: `PROD_ANN_${UNIQUE_TAG}`,
        name: `Kredit Modal Kerja Anuitas (${UNIQUE_TAG})`,
        status: "ACTIVE",
      },
    });
    annuityProductId = annuityProduct.id;
    createdProductIds.push(annuityProductId);

    await db.creditParameter.create({
      data: {
        productId: annuityProductId,
        version: "v1.0-annuity",
        maximumAgeYears: 75,
        maximumAgeMonths: 0,
        maximumTenorMonths: 120,
        maximumPrincipal: 500_000_000,
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
        productId: annuityProductId,
        version: "v1.0-annuity",
        provisionRate: 0.015, // 1.5%
        adminRate: 0.005,
        verificationFee: 75_000,
        flaggingFee: 150_000,
        frontingRate: 0.05,
        reserveRate: 0.10,
        effectiveFrom: new Date("2020-01-01"),
        isActive: true,
      },
    });

    // Seed Insurance Rates for ages 45-55, tenors 1-10 years on both products
    const insuranceData: {
      productId: string;
      age: number;
      tenorYears: number;
      premiumRate: number;
      effectiveFrom: Date;
      isActive: boolean;
    }[] = [];

    for (const pId of [flatProductId, annuityProductId]) {
      for (let age = 40; age <= 60; age++) {
        for (let tenorYears = 1; tenorYears <= 10; tenorYears++) {
          insuranceData.push({
            productId: pId,
            age,
            tenorYears,
            premiumRate: 0.02 + age * 0.0003 + tenorYears * 0.002,
            effectiveFrom: new Date("2020-01-01"),
            isActive: true,
          });
        }
      }
    }
    await db.insuranceRate.createMany({ data: insuranceData });

    // 4. Setup Marketing User
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!mktRole) throw new Error("MARKETING role must exist");

    marketingUsername = `mkt_journey_${UNIQUE_TAG}`;
    const user = await UserRepository.create({
      username: marketingUsername,
      password,
      fullName: "Marketing User E2E Journey",
      roleId: mktRole.id,
      bprId,
      branchId,
      status: "ACTIVE",
    });
    marketingUserId = user.id;
    createdUserIds.push(marketingUserId);

    marketingUserToken = await signSessionToken({
      userId: marketingUserId,
      username: marketingUsername,
      fullName: user.fullName,
      role: "MARKETING",
      bprId,
      branchId,
    });
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
    if (paymentOfficeId) await db.paymentOffice.deleteMany({ where: { id: paymentOfficeId } });
    if (branchId) await db.branch.deleteMany({ where: { id: branchId } });
    if (bprId) await db.bpr.deleteMany({ where: { id: bprId } });
  }, 60000);

  // ═══════════════════════════════════════════════════════════════════════════
  // JOURNEY 1: Complete E2E Flow — FLAT Method
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Complete E2E User Journey — FLAT Calculation Method", () => {
    let flatSimulationId: string;

    it("Step 1 (Login): Marketing logs in and receives authenticated session", async () => {
      const req = makeRequest("POST", "/api/v1/auth/login", undefined, {
        username: marketingUsername,
        password,
      });
      const res = await loginRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.username).toBe(marketingUsername);
      expect(json.user.role).toBe("MARKETING");
    });

    it("Step 2 (Auth Me): Marketing profile and permissions are resolved", async () => {
      const req = makeRequest("GET", "/api/v1/auth/me", marketingUserToken);
      const res = await getMeRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.permissions).toContain("CREDIT_CALCULATE");
      expect(json.user.permissions).toContain("SIMULATION_CREATE");
    });

    it("Step 3 (Open Calculator): Fetches active credit products for tenant", async () => {
      const req = makeRequest("GET", "/api/v1/products", marketingUserToken);
      const res = await getProductsRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(2);
      const flatProd = json.data.find((p: { id: string }) => p.id === flatProductId);
      expect(flatProd).toBeDefined();
    });

    it("Step 4 & 5 (Input & Calculate FLAT): Executes credit calculation pipeline", async () => {
      const calculationPayload = {
        productId: flatProductId,
        birthDate: "1978-05-15", // Age ~48 years
        requestedPrincipal: 100_000_000,
        tenorMonths: 60, // 5 years
        netSalary: 15_000_000,
        method: "FLAT",
        paymentOfficeId,
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingUserToken, calculationPayload);
      const res = await calculateRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const calc = json.data;

      // Verify calculation results
      expect(calc.calculationMethod).toBe("FLAT");
      // Monthly installment: 100M/60 (1.666.666,67) + 100M*0.01 (1.000.000) = 2.666.666,67
      expect(calc.result.installment).toBeCloseTo(2_666_666.67, 0);
      expect(calc.breakdown.installment.principalPortion).toBeCloseTo(1_666_666.67, 0);
      expect(calc.breakdown.installment.interestPortion).toBe(1_000_000);
      expect(calc.status).toBe("OK");
      expect(calc.isEligible).toBe(true);
      expect(calc.schedule).toHaveLength(60);
      expect(calc.schedule[59].closingBalance).toBe(0);
    });

    it("Step 6 & 7 (Save Simulation): Persists formal FLAT credit simulation", async () => {
      const simulationPayload = {
        customerName: "Ahmad Dahlan E2E",
        customerNip: "197805152000031001",
        productId: flatProductId,
        birthDate: "1978-05-15",
        requestedPrincipal: 100_000_000,
        tenorMonths: 60,
        netSalary: 15_000_000,
        method: "FLAT",
        paymentOfficeId,
      };

      const req = makeRequest("POST", "/api/v1/simulations", marketingUserToken, simulationPayload);
      const res = await createSimulationRoute(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.simulationId).toBeDefined();
      expect(json.data.customerName).toBe("Ahmad Dahlan E2E");
      expect(json.data.status).toBe("SAVED");

      flatSimulationId = json.data.simulationId;
      createdSimulationIds.push(flatSimulationId);
    });

    it("Step 8 (Open Simulation Detail): Retrieves persisted FLAT simulation detail snapshot", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${flatSimulationId}`, marketingUserToken);
      const res = await getSimulationDetailRoute(req, makeRouteParams(flatSimulationId));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(flatSimulationId);
      expect(json.data.customerName).toBe("Ahmad Dahlan E2E");
      expect(json.data.result.installment).toBeCloseTo(2_666_666.67, 0);
      expect(json.data.status).toBe("SAVED");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // JOURNEY 2: Complete E2E Flow — ANNUITY Method
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Complete E2E User Journey — ANNUITY Calculation Method", () => {
    let annuitySimulationId: string;

    it("Step 1 & 2: Calculate ANNUITY credit simulation with PMT amortization", async () => {
      const calculationPayload = {
        productId: annuityProductId,
        birthDate: "1982-10-20", // Age ~44 years
        requestedPrincipal: 120_000_000,
        tenorMonths: 36, // 3 years (i = 1%/mo)
        netSalary: 20_000_000,
        method: "ANNUITY",
        paymentOfficeId,
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingUserToken, calculationPayload);
      const res = await calculateRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const calc = json.data;

      // Verify annuity calculation results
      expect(calc.calculationMethod).toBe("ANNUITY");
      // Annuity PMT = 120M * (0.01 * (1.01)^36) / ((1.01)^36 - 1) = Rp 3.985.717,18
      expect(calc.result.installment).toBeCloseTo(3_985_717.18, 0);
      // First month interest = 120M * 1% = 1.200.000
      expect(calc.breakdown.installment.interestPortion).toBeCloseTo(1_200_000, 0);
      // First month principal = 3.985.717,18 - 1.200.000 = 2.785.717,18
      expect(calc.breakdown.installment.principalPortion).toBeCloseTo(2_785_717.18, 0);
      expect(calc.status).toBe("OK");
      expect(calc.isEligible).toBe(true);

      // Verify Amortization Schedule
      expect(calc.schedule).toHaveLength(36);
      expect(calc.schedule[35].closingBalance).toBe(0);

      // Interest portions must decrease over time
      expect(calc.schedule[0].interestPortion).toBeGreaterThan(calc.schedule[35].interestPortion);
      // Principal portions must increase over time
      expect(calc.schedule[0].principalPortion).toBeLessThan(calc.schedule[35].principalPortion);
    });

    it("Step 3: Save formal ANNUITY credit simulation", async () => {
      const simulationPayload = {
        customerName: "Siti Nurhaliza E2E",
        customerNip: "198210202005012002",
        productId: annuityProductId,
        birthDate: "1982-10-20",
        requestedPrincipal: 120_000_000,
        tenorMonths: 36,
        netSalary: 20_000_000,
        method: "ANNUITY",
        paymentOfficeId,
      };

      const req = makeRequest("POST", "/api/v1/simulations", marketingUserToken, simulationPayload);
      const res = await createSimulationRoute(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.simulationId).toBeDefined();
      expect(json.data.customerName).toBe("Siti Nurhaliza E2E");

      annuitySimulationId = json.data.simulationId;
      createdSimulationIds.push(annuitySimulationId);
    });

    it("Step 4: Open ANNUITY simulation detail snapshot", async () => {
      const req = makeRequest("GET", `/api/v1/simulations/${annuitySimulationId}`, marketingUserToken);
      const res = await getSimulationDetailRoute(req, makeRouteParams(annuitySimulationId));

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(annuitySimulationId);
      expect(json.data.customerName).toBe("Siti Nurhaliza E2E");
      expect(json.data.result.installment).toBeCloseTo(3_985_717.18, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. User Simulation Listing & Search Verification
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Simulation List & Overview Verification", () => {
    it("should list all saved simulations (Flat and Annuity) for the marketing user", async () => {
      const req = makeRequest("GET", "/api/v1/simulations?pageSize=10", marketingUserToken);
      const res = await listSimulationsRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(2);
      expect(json.meta.total).toBeGreaterThanOrEqual(2);

      const names = json.data.map((s: { customerName: string }) => s.customerName);
      expect(names).toContain("Ahmad Dahlan E2E");
      expect(names).toContain("Siti Nurhaliza E2E");
    });
  });
});
