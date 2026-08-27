import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSimulationDetail } from "@/app/api/v1/simulations/[id]/route";
import { POST as createSimulation } from "@/app/api/v1/simulations/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-039: GET /api/v1/simulations/:id Integration & Detail Tests", { timeout: 45000 }, () => {
  let superAdminId: string;
  let adminMadiunId: string;
  let marketing1Id: string;
  let marketing2Id: string;
  let unauthorizedUserId: string;

  let superAdminToken: string;
  let adminMadiunToken: string;
  let marketing1Token: string;
  let marketing2Token: string;
  let unauthorizedToken: string;

  let seededBprId: string;
  let seededProductId: string;
  let otherBprId: string;
  let otherProductId: string;

  let marketing1SimId: string;
  let otherBprSimId: string;

  let testUserIds: string[] = [];
  let testSimulationIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch seeded BPR and Product
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

    // Create another BPR and Product for cross-tenant scoping tests
    let otherBpr = await db.bpr.findUnique({
      where: { code: "BPR_OTHER_DETAIL_TEST" },
    });
    if (!otherBpr) {
      otherBpr = await db.bpr.create({
        data: {
          code: "BPR_OTHER_DETAIL_TEST",
          name: "BPR Other Detail Test",
        },
      });
    }
    otherBprId = otherBpr.id;

    let otherProd = await db.product.findUnique({
      where: {
        bprId_code: {
          bprId: otherBprId,
          code: "OTHER_PROD_DETAIL",
        },
      },
    });
    if (!otherProd) {
      otherProd = await db.product.create({
        data: {
          bprId: otherBprId,
          code: "OTHER_PROD_DETAIL",
          name: "Other Product Detail",
        },
      });
    }
    otherProductId = otherProd.id;

    // 2. Fetch canonical roles
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!saRole || !admRole || !mktRole) throw new Error("Roles must exist");

    // 3. Create test users
    const saUser = await UserRepository.create({
      username: `sa_detail_${Date.now()}`,
      fullName: "Super Admin Detail Test",
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
      username: `adm_detail_${Date.now()}`,
      fullName: "Admin Madiun Detail Test",
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

    const mkt1User = await UserRepository.create({
      username: `mkt1_detail_${Date.now()}`,
      fullName: "Marketing 1 Detail Test",
      roleId: mktRole.id,
      bprId: seededBprId,
      password: "MarketingPassword123!",
    });
    marketing1Id = mkt1User.id;
    testUserIds.push(mkt1User.id);
    marketing1Token = await signSessionToken({
      userId: mkt1User.id,
      username: mkt1User.username,
      fullName: mkt1User.fullName,
      role: mktRole.code,
      bprId: seededBprId,
    });

    const mkt2User = await UserRepository.create({
      username: `mkt2_detail_${Date.now()}`,
      fullName: "Marketing 2 Detail Test",
      roleId: mktRole.id,
      bprId: seededBprId,
      password: "MarketingPassword123!",
    });
    marketing2Id = mkt2User.id;
    testUserIds.push(mkt2User.id);
    marketing2Token = await signSessionToken({
      userId: mkt2User.id,
      username: mkt2User.username,
      fullName: mkt2User.fullName,
      role: mktRole.code,
      bprId: seededBprId,
    });

    const unauthRole = await db.role.create({
      data: { code: `NO_DETAIL_VIEW_${Date.now()}`, name: "No Detail View" },
    });
    const unauthUser = await UserRepository.create({
      username: `unauth_detail_${Date.now()}`,
      fullName: "Unauthorized Detail",
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

    // 4. Create formal simulation via POST /api/v1/simulations for Marketing 1
    const createReq = new NextRequest("http://localhost:3000/api/v1/simulations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${marketing1Token}`,
      },
      body: JSON.stringify({
        productId: seededProductId,
        birthDate: "1961-01-01",
        netSalary: 8500000,
        otherIncome: 0,
        requestedPrincipal: 100000000,
        tenorMonths: 60,
        calculationMethod: "FLAT",
        customerName: "Budi Santoso Detail",
        customerNip: "196101011985031001",
        status: "SAVED",
      }),
    });

    const createRes = await createSimulation(createReq);
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    marketing1SimId = createJson.data.simulationId;
    testSimulationIds.push(marketing1SimId);

    // Create a simulation belonging to the other BPR
    const otherSim = await db.simulation.create({
      data: {
        simulationNumber: `SIM-OTHER-${Date.now()}`,
        createdBy: superAdminId,
        bprId: otherBprId,
        productId: otherProductId,
        customerName: "Other BPR Customer",
        calculationMethod: "FLAT",
        businessRuleVersion: "BR-1.0",
        parameterVersion: "v1.0",
        inputSnapshot: { requestedPrincipal: 50000000, tenorMonths: 12 },
        resultSnapshot: { result: { installment: 4500000 } },
        status: "SAVED",
      },
    });
    otherBprSimId = otherSim.id;
    testSimulationIds.push(otherBprSimId);
  }, 45000);

  afterAll(async () => {
    for (const sid of testSimulationIds) {
      await db.simulation.delete({ where: { id: sid } }).catch(() => {});
    }
    for (const uid of testUserIds) {
      await db.simulation.deleteMany({ where: { createdBy: uid } });
      await db.calculation.deleteMany({ where: { createdBy: uid } });
      await db.auditLog.deleteMany({ where: { userId: uid } });
      await db.user.delete({ where: { id: uid } }).catch(() => {});
    }
  }, 45000);

  function createRequest(token?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    return new NextRequest("http://localhost:3000/api/v1/simulations/dummy-id", {
      method: "GET",
      headers,
    });
  }

  describe("Authentication & RBAC", () => {
    it("should reject unauthenticated request with 401", async () => {
      const req = createRequest();
      const res = await getSimulationDetail(req, { params: { id: marketing1SimId } });
      expect(res.status).toBe(401);
    });

    it("should reject user without SIMULATION_VIEW permission with 403", async () => {
      const req = createRequest(unauthorizedToken);
      const res = await getSimulationDetail(req, { params: { id: marketing1SimId } });
      expect(res.status).toBe(403);
    });
  });

  describe("Ownership & Data Scoping", () => {
    it("MARKETING: should grant access to own simulation", async () => {
      const req = createRequest(marketing1Token);
      const res = await getSimulationDetail(req, { params: { id: marketing1SimId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.id).toBe(marketing1SimId);
      expect(json.data.customerName).toBe("Budi Santoso Detail");
    });

    it("MARKETING: should reject access to another user's simulation with 403", async () => {
      const req = createRequest(marketing2Token); // Marketing 2 accessing Marketing 1's simulation
      const res = await getSimulationDetail(req, { params: { id: marketing1SimId } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("ADMIN: should grant access to any simulation within same BPR", async () => {
      const req = createRequest(adminMadiunToken);
      const res = await getSimulationDetail(req, { params: { id: marketing1SimId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.id).toBe(marketing1SimId);
    });

    it("ADMIN: should reject access to simulation of another BPR with 403", async () => {
      const req = createRequest(adminMadiunToken); // Admin Madiun accessing Other BPR simulation
      const res = await getSimulationDetail(req, { params: { id: otherBprSimId } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("SUPER_ADMIN: should grant access to simulations across all BPRs", async () => {
      const req = createRequest(superAdminToken);
      const res = await getSimulationDetail(req, { params: { id: otherBprSimId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.id).toBe(otherBprSimId);
    });
  });

  describe("Comprehensive Detail Payload Verification", () => {
    it("should return full details: input, result, breakdown, insurance, fees, versions, schedule", async () => {
      const req = createRequest(marketing1Token);
      const res = await getSimulationDetail(req, { params: { id: marketing1SimId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      const sim = json.data;

      // Root level
      expect(sim.id).toBe(marketing1SimId);
      expect(sim.simulationNumber).toMatch(/^SIM-\d+-\d+$/);
      expect(sim.status).toBe("SAVED");
      expect(sim.calculationMethod).toBe("FLAT");

      // Relations
      expect(sim.user.fullName).toBe("Marketing 1 Detail Test");
      expect(sim.bpr.code).toBe("BPR_KOTA_MADIUN");
      expect(sim.product.code).toBe("PLATINUM_MADIUN");

      // Input
      expect(sim.input.requestedPrincipal).toBe(100000000);
      expect(sim.input.tenorMonths).toBe(60);

      // Result
      expect(sim.result.installment).toBe(2566666.67);
      expect(sim.result.dbr).toBeCloseTo(0.30196, 4);
      expect(sim.result.netDisbursement).toBeGreaterThan(0);

      // Breakdown
      expect(sim.breakdown.age.currentYears).toBe(65);
      expect(sim.breakdown.tenor.insuranceYears).toBe(5);

      // Insurance
      expect(sim.insurance.rate).toBeGreaterThan(0);
      expect(sim.insurance.premium).toBeGreaterThan(0);

      // Fees
      expect(sim.fees.verification).toBe(1500000);
      expect(sim.fees.flagging).toBe(38000);

      // Versions
      expect(sim.versions.businessRule).toBe("BR-1.0");
      expect(sim.versions.parameter).toBe("v1.0");

      // Schedule
      expect(Array.isArray(sim.schedule)).toBe(true);
      expect(sim.schedule.length).toBe(60);
      expect(sim.schedule[0].period).toBe(1);
      expect(sim.schedule[59].period).toBe(60);
      expect(sim.schedule[59].closingBalance).toBe(0);
    });

    it("should return 404 when simulation does not exist", async () => {
      const req = createRequest(superAdminToken);
      const res = await getSimulationDetail(req, {
        params: { id: "00000000-0000-0000-0000-000000000000" },
      });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe("SIMULATION_NOT_FOUND");
    });
  });
});
