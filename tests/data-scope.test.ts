import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSimulationById } from "@/app/api/v1/test/simulations/[id]/route";
import { DataScopeService } from "@/lib/rbac";
import { UserRepository } from "@/lib/repositories";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken, AuthenticatedUserContext } from "@/lib/auth";

describe("TASK-015: Data Scope Middleware / Service", () => {
  let superAdminToken: string;
  let adminMadiunToken: string;
  let adminMagetanToken: string;
  let marketingAToken: string;
  let marketingBToken: string;

  let superAdminUser: AuthenticatedUserContext;
  let adminMadiunUser: AuthenticatedUserContext;
  let marketingAUser: AuthenticatedUserContext;
  let marketingBUser: AuthenticatedUserContext;

  let superAdminId: string;
  let adminMadiunId: string;
  let adminMagetanId: string;
  let marketingAId: string;
  let marketingBId: string;

  let branchMadiunId: string;
  let branchMagetanId: string;
  let bprMadiunId: string;
  let bprSumekarId: string;
  let productId: string;

  let simulationMarketingAId: string;
  let simulationMarketingBId: string;
  let simulationMagetanId: string;

  beforeAll(async () => {
    // 1. Fetch Roles
    const superAdminRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    const adminRole = await db.role.findUnique({ where: { code: "ADMIN" } });
    const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
    if (!superAdminRole || !adminRole || !mktRole) throw new Error("Roles must exist");

    // 2. Fetch BPRs and Product
    const bprMadiun = await db.bpr.findUnique({ where: { code: "BPR_KOTA_MADIUN" } });
    const bprSumekar = await db.bpr.findUnique({ where: { code: "BPR_BHAKTI_SUMEKAR" } });
    if (!bprMadiun || !bprSumekar) throw new Error("Seeded BPRs must exist");
    bprMadiunId = bprMadiun.id;
    bprSumekarId = bprSumekar.id;

    const product = await db.product.findFirst({ where: { bprId: bprMadiunId } });
    if (!product) throw new Error("Product must exist");
    productId = product.id;

    // 3. Create Branches for Scope Testing
    const branchMadiun = await db.branch.create({
      data: {
        bprId: bprMadiunId,
        code: `BR_MDN_${Date.now()}`,
        name: "Cabang Kota Madiun",
      },
    });
    branchMadiunId = branchMadiun.id;

    const branchMagetan = await db.branch.create({
      data: {
        bprId: bprMadiunId,
        code: `BR_MGT_${Date.now()}`,
        name: "Cabang Magetan",
      },
    });
    branchMagetanId = branchMagetan.id;

    // 4. Create Users
    // Super Admin
    const sa = await UserRepository.create({
      username: `sa_scope_${Date.now()}`,
      password: "Password123!",
      fullName: "Super Admin Scope",
      roleId: superAdminRole.id,
      status: "ACTIVE",
    });
    superAdminId = sa.id;
    superAdminToken = await signSessionToken({
      userId: sa.id,
      username: sa.username,
      fullName: sa.fullName,
      role: "SUPER_ADMIN",
    });

    // Admin Madiun Branch
    const admMdn = await UserRepository.create({
      username: `adm_mdn_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin Branch Madiun",
      roleId: adminRole.id,
      bprId: bprMadiunId,
      branchId: branchMadiunId,
      status: "ACTIVE",
    });
    adminMadiunId = admMdn.id;
    adminMadiunToken = await signSessionToken({
      userId: admMdn.id,
      username: admMdn.username,
      fullName: admMdn.fullName,
      role: "ADMIN",
    });

    // Admin Magetan Branch
    const admMgt = await UserRepository.create({
      username: `adm_mgt_${Date.now()}`,
      password: "Password123!",
      fullName: "Admin Branch Magetan",
      roleId: adminRole.id,
      bprId: bprMadiunId,
      branchId: branchMagetanId,
      status: "ACTIVE",
    });
    adminMagetanId = admMgt.id;
    adminMagetanToken = await signSessionToken({
      userId: admMgt.id,
      username: admMgt.username,
      fullName: admMgt.fullName,
      role: "ADMIN",
    });

    // Marketing A (in Madiun Branch)
    const mktA = await UserRepository.create({
      username: `mkt_a_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing User A",
      roleId: mktRole.id,
      bprId: bprMadiunId,
      branchId: branchMadiunId,
      status: "ACTIVE",
    });
    marketingAId = mktA.id;
    marketingAToken = await signSessionToken({
      userId: mktA.id,
      username: mktA.username,
      fullName: mktA.fullName,
      role: "MARKETING",
    });

    // Marketing B (also in Madiun Branch)
    const mktB = await UserRepository.create({
      username: `mkt_b_${Date.now()}`,
      password: "Password123!",
      fullName: "Marketing User B",
      roleId: mktRole.id,
      bprId: bprMadiunId,
      branchId: branchMadiunId,
      status: "ACTIVE",
    });
    marketingBId = mktB.id;
    marketingBToken = await signSessionToken({
      userId: mktB.id,
      username: mktB.username,
      fullName: mktB.fullName,
      role: "MARKETING",
    });

    // Setup Contexts for Service Unit Tests
    superAdminUser = {
      id: superAdminId,
      username: sa.username,
      fullName: sa.fullName,
      email: null,
      role: "SUPER_ADMIN",
      roleId: superAdminRole.id,
      bprId: null,
      branchId: null,
      permissions: ["SIMULATION_VIEW", "SIMULATION_CREATE", "USER_VIEW"],
      scope: "ALL",
    };

    adminMadiunUser = {
      id: adminMadiunId,
      username: admMdn.username,
      fullName: admMdn.fullName,
      email: null,
      role: "ADMIN",
      roleId: adminRole.id,
      bprId: bprMadiunId,
      branchId: branchMadiunId,
      permissions: ["SIMULATION_VIEW", "SIMULATION_CREATE", "USER_VIEW"],
      scope: "BRANCH",
    };

    marketingAUser = {
      id: marketingAId,
      username: mktA.username,
      fullName: mktA.fullName,
      email: null,
      role: "MARKETING",
      roleId: mktRole.id,
      bprId: bprMadiunId,
      branchId: branchMadiunId,
      permissions: ["SIMULATION_VIEW", "SIMULATION_CREATE"],
      scope: "OWN",
    };

    marketingBUser = {
      id: marketingBId,
      username: mktB.username,
      fullName: mktB.fullName,
      email: null,
      role: "MARKETING",
      roleId: mktRole.id,
      bprId: bprMadiunId,
      branchId: branchMadiunId,
      permissions: ["SIMULATION_VIEW", "SIMULATION_CREATE"],
      scope: "OWN",
    };

    // 5. Create Test Simulations
    const simA = await db.simulation.create({
      data: {
        simulationNumber: `SIM-A-${Date.now()}`,
        createdBy: marketingAId,
        bprId: bprMadiunId,
        branchId: branchMadiunId,
        productId,
        customerName: "Nasabah Marketing A",
        calculationMethod: "FLAT",
        businessRuleVersion: "v1.0.0",
        parameterVersion: "v1",
        inputSnapshot: { principal: 50000000 },
        resultSnapshot: { monthlyInstallment: 1500000 },
        status: "SAVED",
      },
    });
    simulationMarketingAId = simA.id;

    const simB = await db.simulation.create({
      data: {
        simulationNumber: `SIM-B-${Date.now()}`,
        createdBy: marketingBId,
        bprId: bprMadiunId,
        branchId: branchMadiunId,
        productId,
        customerName: "Nasabah Marketing B",
        calculationMethod: "FLAT",
        businessRuleVersion: "v1.0.0",
        parameterVersion: "v1",
        inputSnapshot: { principal: 75000000 },
        resultSnapshot: { monthlyInstallment: 2200000 },
        status: "SAVED",
      },
    });
    simulationMarketingBId = simB.id;

    const simMgt = await db.simulation.create({
      data: {
        simulationNumber: `SIM-MGT-${Date.now()}`,
        createdBy: adminMagetanId,
        bprId: bprMadiunId,
        branchId: branchMagetanId,
        productId,
        customerName: "Nasabah Cabang Magetan",
        calculationMethod: "FLAT",
        businessRuleVersion: "v1.0.0",
        parameterVersion: "v1",
        inputSnapshot: { principal: 100000000 },
        resultSnapshot: { monthlyInstallment: 3000000 },
        status: "SAVED",
      },
    });
    simulationMagetanId = simMgt.id;
  }, 45000);

  afterAll(async () => {
    // Clean up simulations
    const simIds = [simulationMarketingAId, simulationMarketingBId, simulationMagetanId].filter(Boolean);
    if (simIds.length > 0) {
      await db.simulation.deleteMany({ where: { id: { in: simIds } } });
    }

    // Clean up users
    const userIds = [superAdminId, adminMadiunId, adminMagetanId, marketingAId, marketingBId].filter(Boolean);
    if (userIds.length > 0) {
      await db.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }

    // Clean up branches
    const branchIds = [branchMadiunId, branchMagetanId].filter(Boolean);
    if (branchIds.length > 0) {
      await db.branch.deleteMany({ where: { id: { in: branchIds } } });
    }
  }, 45000);

  describe("DataScopeService Unit & Logic", () => {
    it("should return correct scope types per role", () => {
      expect(DataScopeService.getScope(superAdminUser)).toBe("ALL");
      expect(DataScopeService.getScope(adminMadiunUser)).toBe("BRANCH");
      expect(DataScopeService.getScope(marketingAUser)).toBe("OWN");
    });

    it("should generate proper Prisma simulation where clauses", () => {
      const saWhere = DataScopeService.getSimulationWhere(superAdminUser);
      expect(saWhere).toEqual({ deletedAt: null });

      const admWhere = DataScopeService.getSimulationWhere(adminMadiunUser);
      expect(admWhere).toEqual({
        deletedAt: null,
        bprId: bprMadiunId,
        branchId: branchMadiunId,
      });

      const mktWhere = DataScopeService.getSimulationWhere(marketingAUser);
      expect(mktWhere).toEqual({
        deletedAt: null,
        createdBy: marketingAId,
      });
    });

    it("should generate proper Prisma user where clauses and exclude SUPER_ADMIN from Admin scope", () => {
      const saWhere = DataScopeService.getUserWhere(superAdminUser);
      expect(saWhere).toEqual({ deletedAt: null });

      const admWhere = DataScopeService.getUserWhere(adminMadiunUser);
      expect(admWhere).toEqual({
        deletedAt: null,
        role: { code: { not: "SUPER_ADMIN" } },
        bprId: bprMadiunId,
        branchId: branchMadiunId,
      });

      const mktWhere = DataScopeService.getUserWhere(marketingAUser);
      expect(mktWhere).toEqual({
        deletedAt: null,
        id: marketingAId,
      });
    });
  });

  describe("Critical Test: Cross-User & Cross-Scope Access (IDOR Prevention)", () => {
    it("CRITICAL: Marketing A accessing Simulation Marketing B must be DENIED with 403", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/test/simulations/${simulationMarketingBId}`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingAToken}` },
        }
      );

      const res = await getSimulationById(req, {
        params: { id: simulationMarketingBId },
      });

      // Must be forbidden (403), NOT 200
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("tidak memiliki hak akses");
    });

    it("Marketing A accessing Marketing A's own simulation must be ALLOWED with 200", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/test/simulations/${simulationMarketingAId}`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${marketingAToken}` },
        }
      );

      const res = await getSimulationById(req, {
        params: { id: simulationMarketingAId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(simulationMarketingAId);
      expect(body.data.createdBy).toBe(marketingAId);
    });

    it("Admin (Branch Madiun) accessing Marketing A's simulation in Branch Madiun must be ALLOWED with 200", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/test/simulations/${simulationMarketingAId}`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await getSimulationById(req, {
        params: { id: simulationMarketingAId },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(simulationMarketingAId);
    });

    it("Admin (Branch Madiun) accessing Simulation in Branch Magetan must be DENIED with 403", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/test/simulations/${simulationMagetanId}`,
        {
          method: "GET",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${adminMadiunToken}` },
        }
      );

      const res = await getSimulationById(req, {
        params: { id: simulationMagetanId },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it(
      "Super Admin accessing any simulation across users and branches must be ALLOWED with 200",
      async () => {
        for (const simId of [simulationMarketingAId, simulationMarketingBId, simulationMagetanId]) {
          const req = new NextRequest(
            `http://localhost:3000/api/v1/test/simulations/${simId}`,
            {
              method: "GET",
              headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
            }
          );

          const res = await getSimulationById(req, {
        params: { id: simId },
          });

          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body.data.id).toBe(simId);
        }
      },
      20000
    );
  });

  describe("Database Query Scope Isolation", () => {
    it("Marketing A querying simulations with where clause should only see Marketing A's records", async () => {
      const filter = DataScopeService.getSimulationWhere(marketingAUser);
      const results = await db.simulation.findMany({
        where: filter,
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const sim of results) {
        expect(sim.createdBy).toBe(marketingAId);
      }
    });

    it("Admin Madiun querying simulations should only see Madiun Branch records", async () => {
      const filter = DataScopeService.getSimulationWhere(adminMadiunUser);
      const results = await db.simulation.findMany({
        where: filter,
      });

      expect(results.length).toBeGreaterThanOrEqual(2); // Marketing A & Marketing B are in Madiun
      for (const sim of results) {
        expect(sim.branchId).toBe(branchMadiunId);
        expect(sim.bprId).toBe(bprMadiunId);
      }
    });

    it("Super Admin querying simulations should see records across all branches", async () => {
      const filter = DataScopeService.getSimulationWhere(superAdminUser);
      const results = await db.simulation.findMany({
        where: filter,
      });

      const branchIdsFound = new Set(results.map((r) => r.branchId));
      expect(branchIdsFound.has(branchMadiunId)).toBe(true);
      expect(branchIdsFound.has(branchMagetanId)).toBe(true);
    });
  });
});
