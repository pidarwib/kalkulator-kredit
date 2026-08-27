import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { DELETE as deleteSimulation, GET as getSimulationDetail } from "@/app/api/v1/simulations/[id]/route";
import { POST as archiveSimulation } from "@/app/api/v1/simulations/[id]/archive/route";
import { GET as listSimulations } from "@/app/api/v1/simulations/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

describe("TASK-040: Simulation Delete & Archive Integration Tests", { timeout: 45000 }, () => {
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

    // Create another BPR and Product for scoping tests
    let otherBpr = await db.bpr.findUnique({
      where: { code: "BPR_OTHER_DEL_TEST" },
    });
    if (!otherBpr) {
      otherBpr = await db.bpr.create({
        data: {
          code: "BPR_OTHER_DEL_TEST",
          name: "BPR Other Delete Test",
        },
      });
    }
    otherBprId = otherBpr.id;

    let otherProd = await db.product.findUnique({
      where: {
        bprId_code: {
          bprId: otherBprId,
          code: "OTHER_PROD_DEL",
        },
      },
    });
    if (!otherProd) {
      otherProd = await db.product.create({
        data: {
          bprId: otherBprId,
          code: "OTHER_PROD_DEL",
          name: "Other Product Delete",
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
      username: `sa_del_${Date.now()}`,
      fullName: "Super Admin Delete Test",
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
      username: `adm_del_${Date.now()}`,
      fullName: "Admin Madiun Delete Test",
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
      username: `mkt1_del_${Date.now()}`,
      fullName: "Marketing 1 Delete Test",
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
      username: `mkt2_del_${Date.now()}`,
      fullName: "Marketing 2 Delete Test",
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
      data: { code: `NO_DEL_VIEW_${Date.now()}`, name: "No Delete Role" },
    });
    const unauthUser = await UserRepository.create({
      username: `unauth_del_${Date.now()}`,
      fullName: "Unauthorized Delete",
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

  function createRequest(method = "DELETE", token?: string): NextRequest {
    const headers: Record<string, string> = {
      "x-forwarded-for": "192.168.1.105",
      "user-agent": "Vitest-Delete-Agent/1.0",
    };
    if (token) {
      headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    return new NextRequest("http://localhost:3000/api/v1/simulations/dummy-id", {
      method,
      headers,
    });
  }

  describe("Authentication & RBAC", () => {
    it("should reject unauthenticated delete with 401", async () => {
      const req = createRequest("DELETE");
      const res = await deleteSimulation(req, {
        params: { id: "00000000-0000-0000-0000-000000000000" },
      });
      expect(res.status).toBe(401);
    });

    it("should reject user without SIMULATION_DELETE permission with 403", async () => {
      const req = createRequest("DELETE", unauthorizedToken);
      const res = await deleteSimulation(req, {
        params: { id: "00000000-0000-0000-0000-000000000000" },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Soft Delete Ownership & Scoping", () => {
    it("MARKETING: should successfully soft delete own simulation", async () => {
      // Create a simulation for Marketing 1
      const sim = await db.simulation.create({
        data: {
          simulationNumber: `SIM-DEL-MKT1-${Date.now()}`,
          createdBy: marketing1Id,
          bprId: seededBprId,
          productId: seededProductId,
          customerName: "Delete Candidate MKT1",
          calculationMethod: "FLAT",
          businessRuleVersion: "BR-1.0",
          parameterVersion: "v1.0",
          inputSnapshot: { requestedPrincipal: 50000000, tenorMonths: 12 },
          resultSnapshot: { result: { installment: 4500000 } },
          status: "SAVED",
        },
      });
      testSimulationIds.push(sim.id);

      const req = createRequest("DELETE", marketing1Token);
      const res = await deleteSimulation(req, { params: { id: sim.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.id).toBe(sim.id);
      expect(json.data.status).toBe("ARCHIVED");
      expect(json.data.deletedAt).toBeDefined();

      // 1. Verify in database that deletedAt is set
      const dbSim = await db.simulation.findUnique({ where: { id: sim.id } });
      expect(dbSim?.deletedAt).not.toBeNull();
      expect(dbSim?.status).toBe("ARCHIVED");

      // 2. Verify Audit Log was recorded
      const audit = await db.auditLog.findFirst({
        where: {
          action: "SIMULATION_DELETE",
          entityType: "Simulation",
          entityId: sim.id,
          userId: marketing1Id,
        },
      });
      expect(audit).not.toBeNull();

      // 3. Verify GET /simulations/:id now returns 404
      const getReq = new NextRequest(`http://localhost:3000/api/v1/simulations/${sim.id}`, {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${marketing1Token}` },
      });
      const getRes = await getSimulationDetail(getReq, { params: { id: sim.id } });
      expect(getRes.status).toBe(404);

      // 4. Verify GET /simulations list does not include it
      const listReq = new NextRequest("http://localhost:3000/api/v1/simulations", {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${marketing1Token}` },
      });
      const listRes = await listSimulations(listReq);
      const listJson = await listRes.json();
      expect(listJson.data.some((s: any) => s.id === sim.id)).toBe(false);
    });

    it("MARKETING: should reject deleting another user's simulation with 403", async () => {
      const sim = await db.simulation.create({
        data: {
          simulationNumber: `SIM-DEL-MKT2-${Date.now()}`,
          createdBy: marketing2Id,
          bprId: seededBprId,
          productId: seededProductId,
          customerName: "Delete Candidate MKT2",
          calculationMethod: "FLAT",
          businessRuleVersion: "BR-1.0",
          parameterVersion: "v1.0",
          inputSnapshot: { requestedPrincipal: 50000000, tenorMonths: 12 },
          resultSnapshot: { result: { installment: 4500000 } },
          status: "SAVED",
        },
      });
      testSimulationIds.push(sim.id);

      // Marketing 1 attempts to delete Marketing 2's simulation
      const req = createRequest("DELETE", marketing1Token);
      const res = await deleteSimulation(req, { params: { id: sim.id } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");

      // Verify simulation was NOT deleted
      const dbSim = await db.simulation.findUnique({ where: { id: sim.id } });
      expect(dbSim?.deletedAt).toBeNull();
    });

    it("ADMIN: should reject deleting simulation of another BPR with 403", async () => {
      const otherSim = await db.simulation.create({
        data: {
          simulationNumber: `SIM-OTHER-DEL-${Date.now()}`,
          createdBy: superAdminId,
          bprId: otherBprId,
          productId: otherProductId,
          customerName: "Other BPR Sim",
          calculationMethod: "FLAT",
          businessRuleVersion: "BR-1.0",
          parameterVersion: "v1.0",
          inputSnapshot: { requestedPrincipal: 50000000, tenorMonths: 12 },
          resultSnapshot: { result: { installment: 4500000 } },
          status: "SAVED",
        },
      });
      testSimulationIds.push(otherSim.id);

      const req = createRequest("DELETE", adminMadiunToken);
      const res = await deleteSimulation(req, { params: { id: otherSim.id } });
      expect(res.status).toBe(403);
    });

    it("SUPER_ADMIN: should successfully delete any simulation across BPRs", async () => {
      const otherSim = await db.simulation.create({
        data: {
          simulationNumber: `SIM-SA-DEL-${Date.now()}`,
          createdBy: superAdminId,
          bprId: otherBprId,
          productId: otherProductId,
          customerName: "SA Target Sim",
          calculationMethod: "FLAT",
          businessRuleVersion: "BR-1.0",
          parameterVersion: "v1.0",
          inputSnapshot: { requestedPrincipal: 50000000, tenorMonths: 12 },
          resultSnapshot: { result: { installment: 4500000 } },
          status: "SAVED",
        },
      });
      testSimulationIds.push(otherSim.id);

      const req = createRequest("DELETE", superAdminToken);
      const res = await deleteSimulation(req, { params: { id: otherSim.id } });
      expect(res.status).toBe(200);

      const dbSim = await db.simulation.findUnique({ where: { id: otherSim.id } });
      expect(dbSim?.deletedAt).not.toBeNull();
    });
  });

  describe("Explicit Archive Endpoint (POST /api/v1/simulations/:id/archive)", () => {
    it("should archive simulation and record SIMULATION_ARCHIVE audit log", async () => {
      const sim = await db.simulation.create({
        data: {
          simulationNumber: `SIM-ARCHIVE-${Date.now()}`,
          createdBy: marketing1Id,
          bprId: seededBprId,
          productId: seededProductId,
          customerName: "Archive Target Sim",
          calculationMethod: "FLAT",
          businessRuleVersion: "BR-1.0",
          parameterVersion: "v1.0",
          inputSnapshot: { requestedPrincipal: 50000000, tenorMonths: 12 },
          resultSnapshot: { result: { installment: 4500000 } },
          status: "SAVED",
        },
      });
      testSimulationIds.push(sim.id);

      const req = createRequest("POST", marketing1Token);
      const res = await archiveSimulation(req, { params: { id: sim.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.status).toBe("ARCHIVED");

      // Verify in DB
      const dbSim = await db.simulation.findUnique({ where: { id: sim.id } });
      expect(dbSim?.status).toBe("ARCHIVED");
      expect(dbSim?.deletedAt).toBeNull(); // not soft-deleted, just status changed

      // Verify Audit Log
      const audit = await db.auditLog.findFirst({
        where: {
          action: "SIMULATION_ARCHIVE",
          entityType: "Simulation",
          entityId: sim.id,
        },
      });
      expect(audit).not.toBeNull();
    });
  });
});
