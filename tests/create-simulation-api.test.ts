import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as createSimulation } from "@/app/api/v1/simulations/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-037: POST /api/v1/simulations Integration & Transaction Tests", { timeout: 30000 }, () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketingId: string;
  let unauthorizedUserId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketingToken: string;
  let unauthorizedToken: string;

  let seededBprId: string;
  let seededProductId: string;
  let otherBprId: string;
  let otherProductId: string;

  let testUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch seeded BPRs and products
    const bprMadiun = await db.bpr.findUnique({
      where: { code: "BPR_KOTA_MADIUN" },
    });
    if (!bprMadiun) throw new Error("BPR_KOTA_MADIUN must exist");
    seededBprId = bprMadiun.id;

    const prodMadiun = await db.product.findUnique({
      where: {
        bprId_code: {
          bprId: seededBprId,
          code: "PLATINUM_MADIUN",
        },
      },
    });
    if (!prodMadiun) throw new Error("PLATINUM_MADIUN must exist");
    seededProductId = prodMadiun.id;

    // Create a second BPR and Product for scoping tests
    let otherBpr = await db.bpr.findUnique({
      where: { code: "BPR_OTHER_SIM_TEST" },
    });
    if (!otherBpr) {
      otherBpr = await db.bpr.create({
        data: {
          code: "BPR_OTHER_SIM_TEST",
          name: "BPR Other Sim Test",
        },
      });
    }
    otherBprId = otherBpr.id;

    let otherProd = await db.product.findUnique({
      where: {
        bprId_code: {
          bprId: otherBprId,
          code: "OTHER_PROD_SIM",
        },
      },
    });
    if (!otherProd) {
      otherProd = await db.product.create({
        data: {
          bprId: otherBprId,
          code: "OTHER_PROD_SIM",
          name: "Other Product Sim",
        },
      });
    }
    otherProductId = otherProd.id;

    // 2. Fetch canonical roles
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });

    if (!saRole || !admRole || !mktRole) {
      throw new Error("Canonical roles must exist in DB");
    }

    // 3. Create test users with passwords & sessions
    const saUser = await UserRepository.create({
      username: `sa_sim_${Date.now()}`,
      fullName: "Super Admin Sim Test",
      roleId: saRole.id,
      password: "SuperAdminPassword123!",
    });
    superAdminId = saUser.id;
    testUserIds.push(saUser.id);
    superAdminToken = await signSessionToken({
      userId: saUser.id,
      username: saUser.username,
      fullName: saUser.fullName,
      role: saRole.code,
    });

    const admUser = await UserRepository.create({
      username: `adm_sim_${Date.now()}`,
      fullName: "Admin Madiun Sim Test",
      roleId: admRole.id,
      bprId: seededBprId,
      password: "AdminMadiunPassword123!",
    });
    adminMadiunId = admUser.id;
    testUserIds.push(admUser.id);
    adminMadiunToken = await signSessionToken({
      userId: admUser.id,
      username: admUser.username,
      fullName: admUser.fullName,
      role: admRole.code,
      bprId: seededBprId,
    });

    const mktUser = await UserRepository.create({
      username: `mkt_sim_${Date.now()}`,
      fullName: "Marketing Sim Test",
      roleId: mktRole.id,
      bprId: seededBprId,
      password: "MarketingPassword123!",
    });
    marketingId = mktUser.id;
    testUserIds.push(mktUser.id);
    marketingToken = await signSessionToken({
      userId: mktUser.id,
      username: mktUser.username,
      fullName: mktUser.fullName,
      role: mktRole.code,
      bprId: seededBprId,
    });

    // Create a role without SIMULATION_CREATE
    const unauthRole = await db.role.create({
      data: {
        code: `NO_SIM_ROLE_${Date.now()}`,
        name: "No Sim Role",
      },
    });

    const unauthUser = await UserRepository.create({
      username: `unauth_sim_${Date.now()}`,
      fullName: "Unauthorized User Sim",
      roleId: unauthRole.id,
      password: "UnauthorizedPassword123!",
    });
    unauthorizedUserId = unauthUser.id;
    testUserIds.push(unauthUser.id);
    unauthorizedToken = await signSessionToken({
      userId: unauthUser.id,
      username: unauthUser.username,
      fullName: unauthUser.fullName,
      role: unauthRole.code,
    });
  }, 45000);

  afterAll(async () => {
    for (const uid of testUserIds) {
      // Cascade delete simulations
      await db.simulation.deleteMany({ where: { createdBy: uid } });
      await db.calculation.deleteMany({ where: { createdBy: uid } });
      await db.auditLog.deleteMany({ where: { userId: uid } });
      await db.user.delete({ where: { id: uid } }).catch(() => {});
    }
  });

  function createRequest(body: unknown, token?: string): NextRequest {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-forwarded-for": "192.168.1.100",
      "user-agent": "Vitest-Simulation-Agent/1.0",
    };
    if (token) {
      headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    return new NextRequest("http://localhost:3000/api/v1/simulations", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  describe("Authentication & Authorization", () => {
    it("should reject unauthenticated request with 401", async () => {
      const req = createRequest({
        productId: seededProductId,
        birthDate: "1961-01-01",
        netSalary: 10000000,
        requestedPrincipal: 50000000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
      });

      const res = await createSimulation(req);
      expect(res.status).toBe(401);
    });

    it("should reject user without SIMULATION_CREATE permission with 403", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1961-01-01",
          netSalary: 10000000,
          requestedPrincipal: 50000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
        },
        unauthorizedToken
      );

      const res = await createSimulation(req);
      expect(res.status).toBe(403);
    });

    it("should prevent cross-tenant simulation for BPR-restricted user with 403", async () => {
      const req = createRequest(
        {
          productId: otherProductId, // belongs to other BPR
          birthDate: "1961-01-01",
          netSalary: 10000000,
          requestedPrincipal: 100000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
        },
        marketingToken // restricted to seededBprId
      );

      const res = await createSimulation(req);
      expect(res.status).toBe(403);
    });
  });

  describe("End-to-End Simulation Creation & Transaction Persistence", () => {
    it("should atomically persist Simulation + CalculationResult + AmortizationSchedule + AuditLog", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1961-01-01", // Age 65 in 2026
          netSalary: 8500000,
          otherIncome: 0,
          requestedPrincipal: 100000000, // 100M
          tenorMonths: 60, // 5 years
          calculationMethod: "FLAT",
          customerName: "Budi Santoso",
          customerNip: "196101011985031001",
          status: "SAVED",
        },
        marketingToken
      );

      const res = await createSimulation(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.simulationId).toBeDefined();
      expect(json.data.simulationNumber).toMatch(/^SIM-\d+-\d+$/);
      expect(json.data.customerName).toBe("Budi Santoso");
      expect(json.data.customerNip).toBe("196101011985031001");
      expect(json.data.status).toBe("SAVED");
      expect(json.data.calculationMethod).toBe("FLAT");

      const simId = json.data.simulationId;

      // 1. Verify Simulation row in Database
      const dbSim = await db.simulation.findUnique({
        where: { id: simId },
        include: {
          calculationResult: true,
          amortizationSchedules: true,
          eligibilityReasons: true,
        },
      });

      expect(dbSim).not.toBeNull();
      expect(dbSim?.createdBy).toBe(marketingId);
      expect(dbSim?.bprId).toBe(seededBprId);
      expect(dbSim?.productId).toBe(seededProductId);
      expect(dbSim?.status).toBe("SAVED");

      // 2. Verify CalculationResult row in Database
      expect(dbSim?.calculationResult).not.toBeNull();
      const calcRes = dbSim!.calculationResult!;
      expect(calcRes.ageCurrent).toBe(65);
      expect(calcRes.tenorMonths).toBe(60);
      expect(calcRes.installment.toNumber()).toBe(2566666.67);
      expect(calcRes.dbr.toNumber()).toBeCloseTo(0.30196, 4);
      expect(calcRes.flaggingFee.toNumber()).toBe(38000);
      expect(calcRes.verificationFee.toNumber()).toBe(1500000);
      expect(calcRes.eligibilityStatus).toBe("OK");

      // 3. Verify AmortizationSchedule rows (60 rows with exact reconciliation)
      expect(dbSim?.amortizationSchedules.length).toBe(60);
      const sortedSchedules = dbSim!.amortizationSchedules.sort(
        (a, b) => a.periodNumber - b.periodNumber
      );
      expect(sortedSchedules[0].periodNumber).toBe(1);
      expect(sortedSchedules[59].periodNumber).toBe(60);
      expect(sortedSchedules[59].closingBalance.toNumber()).toBe(0);

      // 4. Verify AuditLog entry
      const audit = await db.auditLog.findFirst({
        where: {
          action: "SIMULATION_CREATE",
          entityType: "Simulation",
          entityId: simId,
          userId: marketingId,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.ipAddress).toBe("192.168.1.100");
      expect(audit?.userAgent).toBe("Vitest-Simulation-Agent/1.0");
    });

    it("should successfully create ANNUITY simulation with draft status", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1961-01-01",
          netSalary: 10000000,
          requestedPrincipal: 50000000,
          tenorMonths: 24,
          calculationMethod: "ANNUITY",
          customerName: "Siti Rahmawati",
          status: "DRAFT",
        },
        marketingToken
      );

      const res = await createSimulation(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.data.calculationMethod).toBe("ANNUITY");
      expect(json.data.status).toBe("DRAFT");
      expect(json.data.schedule.length).toBe(24);
      expect(json.data.schedule[23].closingBalance).toBe(0);

      const dbSim = await db.simulation.findUnique({
        where: { id: json.data.simulationId },
        include: { calculationResult: true, amortizationSchedules: true },
      });
      expect(dbSim?.status).toBe("DRAFT");
      expect(dbSim?.amortizationSchedules.length).toBe(24);
    });
  });

  describe("Validation & Error Responses", () => {
    it("should return 422 when debtor age violates maximum age (> 85 years)", async () => {
      const req = createRequest(
        {
          productId: seededProductId,
          birthDate: "1930-01-01", // ~96 years old
          netSalary: 10000000,
          requestedPrincipal: 50000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
        },
        marketingToken
      );

      const res = await createSimulation(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("CALCULATION_VALIDATION_ERROR");
    });

    it("should return 422 for missing product ID", async () => {
      const req = createRequest(
        {
          birthDate: "1961-01-01",
          netSalary: 10000000,
          requestedPrincipal: 50000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
        },
        marketingToken
      );

      const res = await createSimulation(req);
      expect(res.status).toBe(422);
    });
  });
});
