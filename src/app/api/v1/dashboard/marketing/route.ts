import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/dashboard/marketing
 *
 * Retrieves operational metrics & recent simulations for Marketing Dashboard.
 * Data scope:
 * - MARKETING: Scoped strictly to own created simulations (createdBy = user.id)
 * - ADMIN: Scoped to their assigned BPR
 * - SUPER_ADMIN: Global across all BPRs
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "SIMULATION_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;

  // Build Where filter based on Role Scope
  const baseWhere: Prisma.SimulationWhereInput = {
    deletedAt: null,
  };

  if (caller.role === "MARKETING") {
    baseWhere.createdBy = caller.id;
  } else if (caller.role === "ADMIN" && caller.bprId) {
    baseWhere.bprId = caller.bprId;
  }

  // Calculate start of today (local midnight)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayWhere: Prisma.SimulationWhereInput = {
    ...baseWhere,
    createdAt: {
      gte: startOfToday,
    },
  };

  try {
    const [
      totalCount,
      todayCount,
      eligibleCount,
      overCapacityCount,
      todayResults,
      totalResults,
      recentSimulations,
    ] = await Promise.all([
      // 1. Total Simulations
      db.simulation.count({ where: baseWhere }),

      // 2. Simulations Today
      db.simulation.count({ where: todayWhere }),

      // 3. Eligible Count
      db.simulation.count({
        where: {
          ...baseWhere,
          calculationResult: {
            is: {
              eligibilityStatus: "ELIGIBLE",
            },
          },
        },
      }),

      // 4. Over Capacity Count
      db.simulation.count({
        where: {
          ...baseWhere,
          calculationResult: {
            is: {
              eligibilityStatus: "OVER_CAPACITY",
            },
          },
        },
      }),

      // 5. Today Principal Sum
      db.calculationResult.aggregate({
        where: {
          simulation: todayWhere,
        },
        _sum: {
          requestedPrincipal: true,
        },
      }),

      // 6. Total Principal Sum
      db.calculationResult.aggregate({
        where: {
          simulation: baseWhere,
        },
        _sum: {
          requestedPrincipal: true,
        },
      }),

      // 7. Recent 5 Simulations
      db.simulation.findMany({
        where: baseWhere,
        include: {
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
        take: 5,
      }),
    ]);

    const todayPrincipal = Number(todayResults._sum.requestedPrincipal || 0);
    const totalPrincipal = Number(totalResults._sum.requestedPrincipal || 0);
    const eligibilityRate = totalCount > 0 ? (eligibleCount / totalCount) * 100 : 100;

    const formattedRecent = recentSimulations.map((sim) => ({
      id: sim.id,
      simulationNumber: sim.simulationNumber,
      customerName: sim.customerName || "Nasabah Tanpa Nama",
      customerNip: sim.customerNip,
      productName: sim.product?.name || "Produk Kredit",
      productCode: sim.product?.code,
      requestedPrincipal: Number(sim.calculationResult?.requestedPrincipal || 0),
      monthlyInstallment: Number(sim.calculationResult?.installment || 0),
      eligibilityStatus: (sim.calculationResult?.eligibilityStatus === "OVER" || sim.calculationResult?.eligibilityStatus === "OVER_CAPACITY")
        ? "OVER_CAPACITY"
        : "ELIGIBLE",
      totalDbrPercent: Number(sim.calculationResult?.dbr || 0) * 100,
      createdAt: sim.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        data: {
          stats: {
            simulationsToday: todayCount,
            todayPrincipal,
            totalSimulations: totalCount,
            totalPrincipal,
            eligibleCount,
            overCapacityCount,
            eligibilityRate: Math.round(eligibilityRate * 10) / 10,
          },
          recentSimulations: formattedRecent,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Dashboard API] Marketing metrics error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal memuat metrik dashboard marketing.",
        },
      },
      { status: 500 }
    );
  }
}
