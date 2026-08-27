import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as listSimulations } from "@/app/api/v1/simulations/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { SimulationRepository } from "@/lib/repositories/simulation-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-038: GET /api/v1/simulations Integration & Scoping Tests", { timeout: 45000 }, () => {
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

    // Create another BPR and Product
    let otherBpr = await db.bpr.findUnique({
      where: { code: "BPR_OTHER_LIST_TEST" },
    });
    if (!otherBpr) {
      otherBpr = await db.bpr.create({
        data: {
          code: "BPR_OTHER_LIST_TEST",
          name: "BPR Other List Test",
        },
      });
    }
    otherBprId = otherBpr.id;

    let otherProd = await db.product.findUnique({
      where: {
        bprId_code: {
          bprId: otherBprId,
          code: "OTHER_PROD_LIST",
        },
      },
    });
    if (!otherProd) {
      otherProd = await db.product.create({
        data: {
          bprId: otherBprId,
          code: "OTHER_PROD_LIST",
          name: "Other Product List",
        },
      });
    }
    otherProductId = otherProd.id;

    // 2. Fetch canonical roles
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const admRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!saRole || !admRole || !mktRole) throw new Error("Roles must exist");

    // 3. Create users
    const saUser = await UserRepository.create({
      username: `sa_list_${Date.now()}`,
      fullName: "Super Admin List Test",
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
      username: `adm_list_${Date.now()}`,
      fullName: "Admin Madiun List Test",
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
      username: `mkt1_list_${Date.now()}`,
      fullName: "Marketing 1 List Test",
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
      username: `mkt2_list_${Date.now()}`,
      fullName: "Marketing 2 List Test",
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
      data: { code: `NO_SIM_VIEW_${Date.now()}`, name: "No Sim View Role" },
    });
    const unauthUser = await UserRepository.create({
      username: `unauth_list_${Date.now()}`,
      fullName: "Unauthorized User",
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

    // 4. Seed test simulations for different users & BPRs
    // Simulation 1: Created by Marketing 1 (BPR Madiun, Saved)
    const sim1 = await db.simulation.create({
      data: {
        simulationNumber: `SIM-MKT1-${Date.now()}`,
        createdBy: marketing1Id,
        bprId: seededBprId,
        productId: seededProductId,
        customerName: "Budi Santoso Special",
        customerNip: "19800101200001",
        calculationMethod: "FLAT",
        businessRuleVersion: "BR-1.0",
        parameterVersion: "v1.0",
        inputSnapshot: { requestedPrincipal: 100000000, tenorMonths: 60 },
        resultSnapshot: { result: { installment: 2566666.67 } },
        status: "SAVED",
      },
    });
    testSimulationIds.push(sim1.id);

    // Simulation 2: Created by Marketing 2 (BPR Madiun, Draft)
    const sim2 = await db.simulation.create({
      data: {
        simulationNumber: `SIM-MKT2-${Date.now()}`,
        createdBy: marketing2Id,
        bprId: seededBprId,
        productId: seededProductId,
        customerName: "Siti Rahmawati",
        customerNip: "19850505200502",
        calculationMethod: "ANNUITY",
        businessRuleVersion: "BR-1.0",
        parameterVersion: "v1.0",
        inputSnapshot: { requestedPrincipal: 50000000, tenorMonths: 36 },
        resultSnapshot: { result: { installment: 1600000 } },
        status: "DRAFT",
      },
    });
    testSimulationIds.push(sim2.id);

    // Simulation 3: Created by Super Admin on Other BPR (Archived)
    const sim3 = await db.simulation.create({
      data: {
        simulationNumber: `SIM-OTHER-${Date.now()}`,
        createdBy: superAdminId,
        bprId: otherBprId,
        productId: otherProductId,
        customerName: "Agus Pratama Other",
        customerNip: "19900909201003",
        calculationMethod: "FLAT",
        businessRuleVersion: "BR-1.0",
        parameterVersion: "v1.0",
        inputSnapshot: { requestedPrincipal: 75000000, tenorMonths: 48 },
        resultSnapshot: { result: { installment: 2000000 } },
        status: "ARCHIVED",
      },
    });
    testSimulationIds.push(sim3.id);
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

  function createRequest(query = "", token?: string): NextRequest {
    const url = `http://localhost:3000/api/v1/simulations${query}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    return new NextRequest(url, {
      method: "GET",
      headers,
    });
  }

  describe("Authentication & RBAC", () => {
    it("should reject unauthenticated request with 401", async () => {
      const req = createRequest();
      const res = await listSimulations(req);
      expect(res.status).toBe(401);
    });

    it("should reject user without SIMULATION_VIEW permission with 403", async () => {
      const req = createRequest("", unauthorizedToken);
      const res = await listSimulations(req);
      expect(res.status).toBe(403);
    });
  });

  describe("Data Scope Enforcement", () => {
    it("MARKETING SCOPE: should only return simulations created by the caller", async () => {
      const req = createRequest("", marketing1Token);
      const res = await listSimulations(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      // All returned items MUST be created by marketing1Id
      for (const item of json.data) {
        expect(item.createdBy).toBe(marketing1Id);
      }
      expect(json.data.some((s: any) => s.customerName === "Budi Santoso Special")).toBe(true);
      expect(json.data.some((s: any) => s.customerName === "Siti Rahmawati")).toBe(false);
      expect(json.data.some((s: any) => s.customerName === "Agus Pratama Other")).toBe(false);
    });

    it("ADMIN SCOPE: should return all simulations within caller's BPR only", async () => {
      const req = createRequest("", adminMadiunToken);
      const res = await listSimulations(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();

      // Should contain simulations in BPR Madiun (both Marketing 1 & 2)
      for (const item of json.data) {
        expect(item.bprId).toBe(seededBprId);
      }
      expect(json.data.some((s: any) => s.customerName === "Budi Santoso Special")).toBe(true);
      expect(json.data.some((s: any) => s.customerName === "Siti Rahmawati")).toBe(true);
      // But NOT other BPR
      expect(json.data.some((s: any) => s.customerName === "Agus Pratama Other")).toBe(false);
    });

    it("SUPER_ADMIN SCOPE: should return simulations across all BPRs", async () => {
      const req = createRequest("", superAdminToken);
      const res = await listSimulations(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.some((s: any) => s.customerName === "Budi Santoso Special")).toBe(true);
      expect(json.data.some((s: any) => s.customerName === "Siti Rahmawati")).toBe(true);
      expect(json.data.some((s: any) => s.customerName === "Agus Pratama Other")).toBe(true);
    });
  });

  describe("Filtering & Searching", () => {
    it("should filter simulations by status=DRAFT", async () => {
      const req = createRequest("?status=DRAFT", adminMadiunToken);
      const res = await listSimulations(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      for (const item of json.data) {
        expect(item.status).toBe("DRAFT");
      }
      expect(json.data.some((s: any) => s.customerName === "Siti Rahmawati")).toBe(true);
      expect(json.data.some((s: any) => s.customerName === "Budi Santoso Special")).toBe(false);
    });

    it("should search simulations by customer name substring", async () => {
      const req = createRequest("?search=Special", superAdminToken);
      const res = await listSimulations(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.length).toBe(1);
      expect(json.data[0].customerName).toBe("Budi Santoso Special");
    });

    it("should search simulations by NIP substring", async () => {
      const req = createRequest("?search=19850505", superAdminToken);
      const res = await listSimulations(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.length).toBe(1);
      expect(json.data[0].customerNip).toBe("19850505200502");
    });

    it("should paginate simulations with accurate metadata", async () => {
      const req = createRequest("?page=1&pageSize=2", superAdminToken);
      const res = await listSimulations(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.meta).toBeDefined();
      expect(json.meta.page).toBe(1);
      expect(json.meta.pageSize).toBe(2);
      expect(json.meta.total).toBeGreaterThanOrEqual(3);
      expect(json.meta.totalPages).toBeGreaterThanOrEqual(2);
      expect(json.data.length).toBeLessThanOrEqual(2);
    });
  });
});
