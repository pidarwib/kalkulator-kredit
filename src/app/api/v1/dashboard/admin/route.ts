import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/dashboard/admin
 *
 * Retrieves management metrics for Admin & Super Admin dashboard.
 * - Total Marketing Officers
 * - Total Simulations & Cumulative Principal (Rp)
 * - Simulations Today & Today's Principal (Rp)
 * - Eligibility Summary (Eligible vs Over Capacity)
 * - Branch / Officer breakdown
 * - Recent Simulations across BPR/Branches
 *
 * Data Scope:
 * - ADMIN: Scoped strictly to caller's assigned BPR
 * - SUPER_ADMIN: Global across all BPRs
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "USER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;

  // 1. Build Simulation Where Filter based on Scope
  const simulationWhere: Prisma.SimulationWhereInput = {
    deletedAt: null,
  };

  const userWhere: Prisma.UserWhereInput = {
    deletedAt: null,
    role: {
      code: "MARKETING",
    },
  };

  const productWhere: Prisma.ProductWhereInput = {
    deletedAt: null,
    status: "ACTIVE",
  };

  let bprName = "Seluruh Jaringan BPR (Super Admin)";

  if (caller.role === "ADMIN" && caller.bprId) {
    simulationWhere.bprId = caller.bprId;
    userWhere.bprId = caller.bprId;
    productWhere.bprId = caller.bprId;

    const bpr = await db.bpr.findUnique({
      where: { id: caller.bprId },
      select: { name: true },
    });
    if (bpr) bprName = bpr.name;
  }

  // 2. Start of today (midnight)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayWhere: Prisma.SimulationWhereInput = {
    ...simulationWhere,
    createdAt: {
      gte: startOfToday,
    },
  };

  try {
    const [
      totalMarketing,
      totalSimulations,
      simulationsToday,
      eligibleCount,
      overCapacityCount,
      activeProductsCount,
      todayResults,
      totalResults,
      branches,
      recentSimulations,
    ] = await Promise.all([
      // 1. Total Marketing Users
      db.user.count({ where: userWhere }),

      // 2. Total Simulations
      db.simulation.count({ where: simulationWhere }),

      // 3. Simulations Today
      db.simulation.count({ where: todayWhere }),

      // 4. Eligible Count
      db.simulation.count({
        where: {
          ...simulationWhere,
          calculationResult: {
            is: {
              eligibilityStatus: "ELIGIBLE",
            },
          },
        },
      }),

      // 5. Over Capacity Count
      db.simulation.count({
        where: {
          ...simulationWhere,
          calculationResult: {
            is: {
              eligibilityStatus: { in: ["OVER", "OVER_CAPACITY"] },
            },
          },
        },
      }),

      // 6. Active Products Count
      db.product.count({ where: productWhere }),

      // 7. Today Principal Sum
      db.calculationResult.aggregate({
        where: {
          simulation: todayWhere,
        },
        _sum: {
          requestedPrincipal: true,
        },
      }),

      // 8. Total Principal Sum
      db.calculationResult.aggregate({
        where: {
          simulation: simulationWhere,
        },
        _sum: {
          requestedPrincipal: true,
        },
      }),

      // 9. Branches in Scope
      caller.role === "ADMIN" && caller.bprId
        ? db.branch.findMany({
            where: { bprId: caller.bprId, deletedAt: null },
            select: {
              id: true,
              name: true,
              code: true,
              _count: {
                select: {
                  users: { where: { role: { code: "MARKETING" }, deletedAt: null } },
                  simulations: { where: { deletedAt: null } },
                },
              },
            },
          })
        : [],

      // 10. Recent 8 Simulations across scope
      db.simulation.findMany({
        where: simulationWhere,
        include: {
          user: {
            select: {
              fullName: true,
              username: true,
              branch: { select: { name: true } },
            },
          },
          product: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          calculationResult: {
            select: {
              requestedPrincipal: true,
              installment: true,
              eligibilityStatus: true,
              dbr: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const todayPrincipal = Number(todayResults._sum.requestedPrincipal || 0);
    const totalPrincipal = Number(totalResults._sum.requestedPrincipal || 0);
    const eligibilityRate =
      totalSimulations > 0 ? (eligibleCount / totalSimulations) * 100 : 100;

    const formattedBranches = branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      marketingCount: b._count.users,
      simulationCount: b._count.simulations,
    }));

    const formattedRecent = recentSimulations.map((sim) => ({
      id: sim.id,
      simulationNumber: sim.simulationNumber,
      customerName: sim.customerName || "Nasabah Tanpa Nama",
      customerNip: sim.customerNip,
      officerName: sim.user?.fullName || "Petugas",
      branchName: sim.user?.branch?.name || null,
      productName: sim.product?.name || "Produk Kredit",
      requestedPrincipal: Number(sim.calculationResult?.requestedPrincipal || 0),
      monthlyInstallment: Number(sim.calculationResult?.installment || 0),
      eligibilityStatus:
        sim.calculationResult?.eligibilityStatus === "OVER" ||
        sim.calculationResult?.eligibilityStatus === "OVER_CAPACITY"
          ? "OVER_CAPACITY"
          : "ELIGIBLE",
      totalDbrPercent: Number(sim.calculationResult?.dbr || 0) * 100,
      createdAt: sim.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        data: {
          bprName,
          stats: {
            totalMarketing,
            totalSimulations,
            totalPrincipal,
            simulationsToday,
            todayPrincipal,
            eligibleCount,
            overCapacityCount,
            eligibilityRate: Math.round(eligibilityRate * 10) / 10,
            activeProductsCount,
          },
          branches: formattedBranches,
          recentSimulations: formattedRecent,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Dashboard API] Admin metrics error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal memuat metrik dashboard admin.",
        },
      },
      { status: 500 }
    );
  }
}
