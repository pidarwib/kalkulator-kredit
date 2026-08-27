import { NextRequest, NextResponse } from "next/server";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { SimulationRepository } from "@/lib/repositories/simulation-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/v1/simulations/:id/archive
 *
 * Explicitly updates the lifecycle status of a simulation to ARCHIVED.
 * Permission: SIMULATION_UPDATE or SIMULATION_DELETE (Super Admin, Admin, Marketing)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  // 1. Permission check (allows users with SIMULATION_DELETE or SIMULATION_UPDATE)
  const auth = await requirePermission(request, "SIMULATION_DELETE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const simulationId = params.id;

  if (!simulationId) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_SIMULATION_ID",
          message: "ID simulasi tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const simulation = await SimulationRepository.findById(simulationId);

    if (!simulation || simulation.deletedAt !== null) {
      return NextResponse.json(
        {
          error: {
            code: "SIMULATION_NOT_FOUND",
            message: `Simulasi dengan ID '${simulationId}' tidak ditemukan.`,
          },
        },
        { status: 404 }
      );
    }

    // Ownership / Scope check
    if (caller.role === "MARKETING") {
      if (simulation.createdBy !== caller.id) {
        return forbiddenResponse(
          "Anda tidak memiliki hak untuk mengarsipkan simulasi pengguna lain."
        );
      }
    } else if (caller.role === "ADMIN") {
      if (caller.bprId && simulation.bprId !== caller.bprId) {
        return forbiddenResponse(
          "Anda tidak memiliki hak untuk mengarsipkan simulasi BPR lain."
        );
      }
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    const archived = await SimulationRepository.archive(
      simulationId,
      caller.id,
      ipAddress,
      userAgent
    );

    return NextResponse.json(
      {
        data: {
          id: archived.id,
          simulationNumber: archived.simulationNumber,
          status: archived.status,
          message: "Simulasi berhasil diarsipkan.",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Archive Simulation API] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan internal server saat mengarsipkan simulasi.",
        },
      },
      { status: 500 }
    );
  }
}
