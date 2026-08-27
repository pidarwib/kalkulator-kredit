import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as calculateCredit } from "@/app/api/v1/calculations/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-036 — Calculation Response Contract Verification", { timeout: 30000 }, () => {
  let marketingToken: string;
  let testUserIds: string[] = [];
  let seededProductId: string;
  let seededBprId: string;

  beforeAll(async () => {
    // 1. Load seeded BPR & Active Product
    const madiunBpr = await db.bpr.findUnique({
      where: { code: "BPR_KOTA_MADIUN" },
    });
    if (!madiunBpr) throw new Error("BPR Kota Madiun must exist in DB");
    seededBprId = madiunBpr.id;

    const platinumProduct = await db.product.findUnique({
      where: {
        bprId_code: {
          bprId: seededBprId,
          code: "PLATINUM_MADIUN",
        },
      },
    });
    if (!platinumProduct) throw new Error("Product PLATINUM_MADIUN must exist in DB");
    seededProductId = platinumProduct.id;

    // 2. Create Marketing User
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!mktRole) throw new Error("MARKETING role must exist");

    const mktUser = await UserRepository.create({
      username: `mkt_contract_${Date.now()}`,
      fullName: "Marketing Contract Tester",
      roleId: mktRole.id,
      bprId: seededBprId,
      password: "MarketingContract123!",
    });
    testUserIds.push(mktUser.id);

    marketingToken = await signSessionToken({
      userId: mktUser.id,
      username: mktUser.username,
      fullName: mktUser.fullName,
      role: mktRole.code,
      bprId: seededBprId,
    });
  }, 45000);

  afterAll(async () => {
    for (const uid of testUserIds) {
      await db.calculation.deleteMany({ where: { createdBy: uid } });
      await db.auditLog.deleteMany({ where: { userId: uid } });
      await db.user.delete({ where: { id: uid } }).catch(() => {});
    }
  });

  function createRequest(body: unknown, token?: string): NextRequest {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    return new NextRequest("http://localhost:3000/api/v1/calculations", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  describe("API_SPECIFICATION Section 23 — Calculation Response Structure", () => {
    it("should return exact contract fields and types for FLAT calculation", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1961-01-01",
          netSalary: 8500000,
          otherIncome: 0,
          requestedPrincipal: 100000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
        },
        marketingToken
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();

      const payload = json.data;

      // 1. Root level contract properties
      expect(typeof payload.calculationId).toBe("string");
      expect(typeof payload.calculationNumber).toBe("string");
      expect(payload.status).toBe("OK");
      expect(payload.isEligible).toBe(true);
      expect(payload.calculationMethod).toBe("FLAT");

      // 2. Input contract structure
      expect(payload.input).toBeDefined();
      expect(typeof payload.input.requestedPrincipal).toBe("number");
      expect(typeof payload.input.tenorMonths).toBe("number");
      expect(payload.input.requestedPrincipal).toBe(100000000);
      expect(payload.input.tenorMonths).toBe(60);
      expect(payload.input.calculationMethod).toBe("FLAT");

      // 3. Result contract structure
      expect(payload.result).toBeDefined();
      expect(typeof payload.result.maximumPrincipal).toBe("number");
      expect(typeof payload.result.installment).toBe("number");
      expect(typeof payload.result.dbr).toBe("number");
      expect(typeof payload.result.remainingSalary).toBe("number");
      expect(typeof payload.result.totalFees).toBe("number");
      expect(typeof payload.result.flaggingFee).toBe("number");
      expect(typeof payload.result.payoffAmount).toBe("number");
      expect(typeof payload.result.netDisbursement).toBe("number");

      expect(payload.result.flaggingFee).toBe(38000);
      expect(payload.result.payoffAmount).toBe(0);
      expect(payload.result.installment).toBe(2566666.67);
      expect(payload.result.dbr).toBeCloseTo(0.30196, 4);

      // 4. Insurance contract structure
      expect(payload.insurance).toBeDefined();
      expect(typeof payload.insurance.rate).toBe("number");
      expect(typeof payload.insurance.premium).toBe("number");
      expect(typeof payload.insurance.fronting).toBe("number");
      expect(typeof payload.insurance.reserve).toBe("number");
      expect(payload.insurance.rate).toBeGreaterThan(0);

      // 5. Fees contract structure
      expect(payload.fees).toBeDefined();
      expect(typeof payload.fees.admin).toBe("number");
      expect(typeof payload.fees.provision).toBe("number");
      expect(typeof payload.fees.verification).toBe("number");
      expect(typeof payload.fees.flagging).toBe("number");
      expect(typeof payload.fees.installmentDeduction).toBe("number");

      expect(payload.fees.verification).toBe(1500000);
      expect(payload.fees.flagging).toBe(38000);
      expect(payload.fees.installmentDeduction).toBeCloseTo(2566666.67 * 2, 1);

      // 6. Versions contract structure
      expect(payload.versions).toBeDefined();
      expect(typeof payload.versions.businessRule).toBe("string");
      expect(typeof payload.versions.parameter).toBe("string");
      expect(payload.versions.businessRule).toBe("BR-1.0");
      expect(payload.versions.parameter).toBe("v1.0");

      // 7. Breakdown structure
      expect(payload.breakdown).toBeDefined();
      expect(payload.breakdown.age.currentYears).toBe(65);
      expect(payload.breakdown.tenor.insuranceYears).toBe(5);

      // 8. Schedule structure
      expect(Array.isArray(payload.schedule)).toBe(true);
      expect(payload.schedule.length).toBe(60);
      expect(payload.schedule[0].period).toBe(1);
      expect(payload.schedule[59].period).toBe(60);
      expect(payload.schedule[59].closingBalance).toBe(0);
    });

    it("should return exact contract fields and types for ANNUITY calculation", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1961-01-01",
          netSalary: 10000000,
          requestedPrincipal: 50000000,
          tenorMonths: 24,
          calculationMethod: "ANNUITY",
        },
        marketingToken
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      const payload = json.data;

      expect(payload.calculationMethod).toBe("ANNUITY");
      expect(payload.status).toBe("OK");
      expect(payload.isEligible).toBe(true);
      expect(payload.result.installment).toBeGreaterThan(0);
      expect(payload.schedule.length).toBe(24);
      expect(payload.schedule[23].closingBalance).toBe(0);
    });
  });

  describe("API_SPECIFICATION Section 25 — Calculation Validation Error Contract", () => {
    it("should return HTTP 422 with exact error response schema on invalid input", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1930-01-01", // Debtor > 85 years old
          netSalary: 5000000,
          requestedPrincipal: 50000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
        },
        marketingToken
      );

      const res = await calculateCredit(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("CALCULATION_VALIDATION_ERROR");
      expect(typeof json.error.message).toBe("string");
      expect(json.error.details).toBeDefined();
      expect(typeof json.error.details).toBe("object");
      expect(json.error.details.birthDate).toBeDefined();
    });
  });
});
