/**
 * TASK-064 — Financial Parameter Tampering Security Tests
 *
 * Verifies that the backend server is the SOLE AUTHORITATIVE SOURCE OF TRUTH
 * for all financial calculations, formulas, parameters, insurance rates, and fees.
 *
 * Threat Model:
 * Malicious client or compromised frontend attempts to inject/tamper:
 * - `dbr: 0.99` or `maxDbr: 0.99` (to bypass debt burden ratio)
 * - `insuranceRate: 0.001` or `premium: 1000` (to underpay insurance)
 * - `provisionRate: 0`, `adminFee: 0`, `flaggingFee: 0`, `verificationFee: 0` (to waive fees)
 * - `flatAnnualRate: 0.01` (1% interest instead of official 12%)
 * - `maximumPrincipal: 100_000_000_000` (to bypass loan ceiling)
 * - `resultSnapshot` with spoofed low installments in `POST /api/v1/simulations`
 *
 * Expected Behavior:
 * The backend MUST ignore/discard all client-supplied financial parameters and
 * compute calculations strictly using authoritative database records.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as createCalculation } from "@/app/api/v1/calculations/route";
import { POST as createSimulation } from "@/app/api/v1/simulations/route";
import { GET as getSimulationDetail } from "@/app/api/v1/simulations/[id]/route";
import { CreditCalculationOrchestrator } from "@/lib/calculation";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

const UNIQUE_TAG = `tamper_${Date.now()}`;
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

describe("TASK-064: Financial Parameter Tampering Security Tests", { timeout: TIMEOUT_MS }, () => {
  let marketingToken: string;
  let marketingId: string;
  let bprId: string;
  let productId: string;
  let creditParamId: string;
  let feeParamId: string;

  // Expected authoritative parameters from database
  const OFFICIAL_FLAT_RATE = 0.12; // 12% annual flat rate
  const OFFICIAL_MAX_DBR = 0.85;   // 85% DBR
  const OFFICIAL_MAX_PRINCIPAL = 150_000_000; // 150 Million
  const OFFICIAL_PROVISION_RATE = 0.01; // 1%
  const OFFICIAL_ADMIN_RATE = 0.005;    // 0.5%
  const OFFICIAL_FLAGGING_FEE = 150_000;
  const OFFICIAL_VERIFICATION_FEE = 50_000;

  const createdUserIds: string[] = [];
  const createdSimulationIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch marketing role and seeded BPR
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!mktRole) throw new Error("Seeded MARKETING role must exist.");

    const bpr = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    if (!bpr) throw new Error("Seeded BPR_KOTA_MADIUN must exist.");
    bprId = bpr.id;

    // 2. Create a dedicated Product with strict, known financial parameters
    const product = await db.product.create({
      data: {
        bprId,
        code: `PROD_TAMPER_${UNIQUE_TAG}`,
        name: `Product Tamper Test (${UNIQUE_TAG})`,
        status: "ACTIVE",
      },
    });
    productId = product.id;
    createdProductIds.push(productId);

    // 3. Create active CreditParameter
    const creditParam = await db.creditParameter.create({
      data: {
        productId,
        version: "v1.0-tamper-test",
        maximumAgeYears: 75,
        maximumAgeMonths: 0,
        maximumTenorMonths: 120,
        maximumPrincipal: OFFICIAL_MAX_PRINCIPAL,
        maximumDbr: OFFICIAL_MAX_DBR,
        flatAnnualRate: OFFICIAL_FLAT_RATE,
        flatMonthlyRate: OFFICIAL_FLAT_RATE / 12,
        principalRoundingIncrement: 100_000,
        installmentDeductionPeriods: 1,
        effectiveFrom: new Date("2026-01-01"),
        isActive: true,
      },
    });
    creditParamId = creditParam.id;

    // 4. Create active FeeParameter
    const feeParam = await db.feeParameter.create({
      data: {
        productId,
        version: "v1.0-tamper-test",
        provisionRate: OFFICIAL_PROVISION_RATE,
        adminRate: OFFICIAL_ADMIN_RATE,
        verificationFee: OFFICIAL_VERIFICATION_FEE,
        flaggingFee: OFFICIAL_FLAGGING_FEE,
        frontingRate: 0.05,
        reserveRate: 0.10,
        effectiveFrom: new Date("2026-01-01"),
        isActive: true,
      },
    });
    feeParamId = feeParam.id;

    // 5. Create active InsuranceRate (for age 50, tenor 5 years)
    await db.insuranceRate.create({
      data: {
        productId,
        version: "v1.0-tamper-test",
        age: 50,
        tenorYears: 5,
        premiumRate: 0.035, // 3.5%
        effectiveFrom: new Date("2026-01-01"),
        isActive: true,
      },
    });

    // Also for age 51
    await db.insuranceRate.create({
      data: {
        productId,
        version: "v1.0-tamper-test",
        age: 51,
        tenorYears: 5,
        premiumRate: 0.038, // 3.8%
        effectiveFrom: new Date("2026-01-01"),
        isActive: true,
      },
    });

    // 6. Create Marketing user
    const mktUser = await UserRepository.create({
      username: `mkt_tamper_${UNIQUE_TAG}`,
      password: "Password123!",
      fullName: "Marketing Tamper Test",
      roleId: mktRole.id,
      bprId,
    });
    marketingId = mktUser.id;
    createdUserIds.push(marketingId);
    marketingToken = await signSessionToken({
      userId: marketingId,
      username: mktUser.username,
      fullName: mktUser.fullName,
      role: mktRole.code,
      bprId,
    });
  }, 60000);

  afterAll(async () => {
    // Clean up created data
    if (createdSimulationIds.length > 0) {
      await db.simulation.deleteMany({ where: { id: { in: createdSimulationIds } } });
    }
    if (createdUserIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdProductIds.length > 0) {
      await db.calculation.deleteMany({ where: { productId: { in: createdProductIds } } });
      await db.insuranceRate.deleteMany({ where: { productId: { in: createdProductIds } } });
      await db.feeParameter.deleteMany({ where: { productId: { in: createdProductIds } } });
      await db.creditParameter.deleteMany({ where: { productId: { in: createdProductIds } } });
      await db.product.deleteMany({ where: { id: { in: createdProductIds } } });
    }
  }, 60000);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: DBR Limit Tampering Attempt
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. DBR Limit Tampering Resistance", () => {
    it("should IGNORE client-supplied dbr: 0.99 / maxDbr: 0.99 and enforce DB maximumDbr (0.85)", async () => {
      // Borrower salary = 2.000.000.
      // Plafon 50.000.000, 60 bulan, 12% flat rate -> Installment = ~1.333.333.
      // DBR = 1.333.333 / 2.000.000 = 66.67% (under 85%).
      // But if salary is 1.400.000 -> DBR = 1.333.333 / 1.400.000 = 95.24% (> 85% limit).
      // If client injects dbr: 0.99 (99%), malicious expectation is ELIGIBLE / OK.
      // Authoritative engine must evaluate it as OVER (Over Capacity / Ineligible).

      const tamperedPayload = {
        productId,
        birthDate: "1976-01-01", // age 50
        netSalary: 1_400_000,
        otherIncome: 0,
        requestedPrincipal: 50_000_000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
        // TAMPER ATTEMPTS:
        dbr: 0.99,
        maxDbr: 0.99,
        maximumDbr: 0.99,
        totalDbrPercent: 50.0,
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingToken, tamperedPayload);
      const res = await createCalculation(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const calcData = json.data;

      // Status must be OVER because 95.24% exceeds official 85% DBR limit
      expect(calcData.status).toBe("OVER");
      expect(calcData.isEligible).toBe(false);
      expect(calcData.reasons.some((r: string) => r.toLowerCase().includes("dbr"))).toBe(true);

      // Verify the DBR in result reflects true mathematical formula, not client's 0.99
      expect(calcData.result.dbr).toBeCloseTo(1333333.33 / 1400000, 2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Insurance Rate & Premium Tampering Attempt
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Insurance Rate Tampering Resistance", () => {
    it("should IGNORE client-supplied insuranceRate: 0.001 / premium: 1000 and calculate using DB matrix", async () => {
      const tamperedPayload = {
        productId,
        birthDate: "1976-01-01", // age 50
        netSalary: 10_000_000,
        otherIncome: 0,
        requestedPrincipal: 50_000_000,
        tenorMonths: 60, // 5 years
        calculationMethod: "FLAT",
        // TAMPER ATTEMPTS:
        insuranceRate: 0.001,
        insurancePercentage: 0.001,
        premium: 50_000,
        insurancePremium: 50_000,
        totalInsuranceCharge: 50_000,
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingToken, tamperedPayload);
      const res = await createCalculation(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const insurance = json.data.insurance;

      // Authoritative rate is 0.038 (3.8% for rounded age 51) from DB
      expect(insurance.rate).toBeCloseTo(0.038, 3);
      // Authoritative premium is 50.000.000 * 0.038 = 1.900.000, NOT client's 50.000
      expect(insurance.premium).toBe(1_900_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Fee & Deduction Tampering Attempt
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Fee & Deductions Tampering Resistance", () => {
    it("should IGNORE client attempts to waive or reduce provision, admin, flagging, and verification fees", async () => {
      const tamperedPayload = {
        productId,
        birthDate: "1976-01-01",
        netSalary: 10_000_000,
        requestedPrincipal: 50_000_000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
        // TAMPER ATTEMPTS:
        provisionRate: 0,
        provisionFee: 0,
        provision: 0,
        adminRate: 0,
        adminFee: 0,
        admin: 0,
        flaggingFee: 0,
        flagging: 0,
        verificationFee: 0,
        verification: 0,
        installmentDeduction: 0,
        totalFees: 0,
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingToken, tamperedPayload);
      const res = await createCalculation(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const fees = json.data.fees;

      // Authoritative Provision = 50.000.000 * 1% = 500.000
      expect(fees.provision).toBe(500_000);
      expect(fees.provisionRate).toBeCloseTo(0.01, 3);

      // Authoritative Admin = 50.000.000 * 0.5% = 250.000
      expect(fees.admin).toBe(250_000);
      expect(fees.adminRate).toBeCloseTo(0.005, 3);

      // Authoritative Verification = 50.000
      expect(fees.verification).toBe(50_000);

      // Authoritative Flagging = 150.000
      expect(fees.flagging).toBe(150_000);

      // Upfront Installment Deduction (1 period) = ~1.333.333
      expect(fees.installmentDeduction).toBeGreaterThan(1_000_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Interest Rate / Margin Tampering Attempt
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Interest / Flat Margin Rate Tampering Resistance", () => {
    it("should IGNORE client-supplied interest rate (1%) and compute installment using DB rate (12%)", async () => {
      const tamperedPayload = {
        productId,
        birthDate: "1976-01-01",
        netSalary: 10_000_000,
        requestedPrincipal: 60_000_000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
        // TAMPER ATTEMPTS:
        flatAnnualRate: 0.01, // 1%
        annualMarginRate: 0.01,
        interestRate: 0.01,
        rate: 0.01,
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingToken, tamperedPayload);
      const res = await createCalculation(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const installmentBreakdown = json.data.breakdown.installment;

      // Authoritative 12% flat rate on 60M for 60 mo:
      // Principal/mo = 60M / 60 = 1.000.000
      // Margin/mo = 60M * 12% / 12 = 600.000
      // Installment = 1.600.000
      expect(installmentBreakdown.annualRate).toBeCloseTo(0.12, 3);
      expect(installmentBreakdown.principalPortion).toBe(1_000_000);
      expect(installmentBreakdown.interestPortion).toBe(600_000);
      expect(installmentBreakdown.monthlyInstallment).toBe(1_600_000);
      expect(json.data.result.installment).toBe(1_600_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Maximum Principal & Plafon Ceiling Tampering Attempt
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5. Maximum Principal Ceiling Tampering Resistance", () => {
    it("should IGNORE client-supplied maximumPrincipal: 100 Billion and reject principal exceeding DB ceiling (150 Million)", async () => {
      const tamperedPayload = {
        productId,
        birthDate: "1976-01-01",
        netSalary: 50_000_000,
        requestedPrincipal: 200_000_000, // Exceeds DB limit of 150M
        tenorMonths: 60,
        calculationMethod: "FLAT",
        // TAMPER ATTEMPTS:
        maximumPrincipal: 100_000_000_000,
        maxPrincipal: 100_000_000_000,
      };

      const req = makeRequest("POST", "/api/v1/calculations", marketingToken, tamperedPayload);
      const res = await createCalculation(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const calcData = json.data;

      // Status must be OVER due to product maximum principal exceeded
      expect(calcData.status).toBe("OVER");
      expect(calcData.isEligible).toBe(false);
      expect(calcData.reasons.some((r: string) => r.toLowerCase().includes("plafon") || r.toLowerCase().includes("principal"))).toBe(true);

      // Breakdown productMax must be 150M, not 100 Billion
      expect(calcData.breakdown.principal.productMax).toBe(150_000_000);
      expect(calcData.breakdown.principal.finalMax).toBe(150_000_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: Simulation Persistence Result Spoofing (POST /api/v1/simulations)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("6. Simulation Result Snapshot Spoofing Resistance", () => {
    it("should RECOMPUTE and save authoritative calculation results when client injects a fake resultSnapshot in POST /api/v1/simulations", async () => {
      // Client sends fake result snapshot claiming installment is Rp 100.000 and status is OK
      const maliciousSimulationPayload = {
        productId,
        customerName: "Nasabah Tamper Test",
        customerNip: "198501012010011001",
        birthDate: "1976-01-01",
        netSalary: 10_000_000,
        requestedPrincipal: 50_000_000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
        status: "SAVED",
        // FAKE SPOOFED SNAPSHOT:
        resultSnapshot: {
          result: {
            installment: 100_000, // Fake cheap installment
            totalFees: 0,
            netDisbursement: 50_000_000,
          },
          status: "OK",
          isEligible: true,
        },
        inputSnapshot: {
          interestRate: 0.01,
        },
      };

      const req = makeRequest("POST", "/api/v1/simulations", marketingToken, maliciousSimulationPayload);
      const res = await createSimulation(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      const simId = json.data?.simulationId || json.data?.id;
      expect(simId).toBeDefined();
      createdSimulationIds.push(simId);

      // Now fetch the persisted simulation from the database/detail API
      const detailReq = makeRequest("GET", `/api/v1/simulations/${simId}`, marketingToken);
      const detailRes = await getSimulationDetail(detailReq, makeRouteParams(simId));

      expect(detailRes.status).toBe(200);
      const detailJson = await detailRes.json();
      const persistedResult = detailJson.data.result;

      // Verify that backend persisted AUTHORITATIVE installment (1.333.333), NOT client's fake 100.000
      expect(persistedResult.installment).toBeCloseTo(1_333_333.33, -2);
      expect(persistedResult.installment).not.toBe(100_000);

      // Verify insurance was authoritatively computed as 1.900.000 (50M * 3.8%)
      expect(detailJson.data.insurance.premium).toBe(1_900_000);

      // Verify fees were authoritatively computed
      expect(detailJson.data.fees.provision).toBe(500_000);
      expect(detailJson.data.fees.admin).toBe(250_000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7: Direct Orchestrator Execution Unit Logic
  // ═══════════════════════════════════════════════════════════════════════════

  describe("7. Direct CreditCalculationOrchestrator Security Guard", () => {
    it("should never populate result properties from client input fields", async () => {
      const hostileInput = {
        productId,
        birthDate: "1976-01-01",
        netSalary: 10_000_000,
        requestedPrincipal: 50_000_000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
        // Hostile properties trying to override domain logic:
        settlementPayoff: 0,
        otherFee: 0,
        otherDeductions: 0,
        // Injected overrides:
        dbr: 0.05,
        insuranceRate: 0.0001,
        flatAnnualRate: 0.0001,
        provisionPercentage: 0,
        administrationPercentage: 0,
        verificationFee: 0,
        flaggingFee: 0,
      };

      const result = await CreditCalculationOrchestrator.execute(hostileInput, marketingId);

      expect(result.result.installment).toBeGreaterThan(1_000_000);
      expect(result.insurance.rate).toBeCloseTo(0.038, 3);
      expect(result.fees.provisionRate).toBeCloseTo(0.01, 3);
      expect(result.fees.adminRate).toBeCloseTo(0.005, 3);
      expect(result.fees.flagging).toBe(150_000);
      expect(result.fees.verification).toBe(50_000);
    });
  });
});
