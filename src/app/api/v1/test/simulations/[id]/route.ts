import { NextRequest, NextResponse } from "next/server";
import { requirePermission, DataScopeService, forbiddenResponse } from "@/lib/rbac";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/test/simulations/[id]
 *
 * Demonstrates IDOR Protection and Data Scoping:
 * 1. Authenticate & Authorize Permission (SIMULATION_VIEW)
 * 2. Load Resource
 * 3. Check Ownership / Data Scope (SUPER_ADMIN=ALL, ADMIN=BRANCH, MARKETING=OWN)
 * 4. Return 403 Forbidden if user tries to access a simulation outside their scope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate & Authorize
  const auth = await requirePermission(request, "SIMULATION_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const { id } = params;

  // 2. Fetch resource
  const simulation = await db.simulation.findUnique({
    where: { id },
  });

  if (!simulation || simulation.deletedAt) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Simulasi tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // 3. Enforce Data Scope (IDOR Protection)
  const canAccess = DataScopeService.canAccessSimulation(auth.user!, {
    id: simulation.id,
    createdBy: simulation.createdBy,
    bprId: simulation.bprId,
    branchId: simulation.branchId,
  });

  if (!canAccess) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat data simulasi ini."
    );
  }

  return NextResponse.json(
    {
      data: {
        id: simulation.id,
        simulationNumber: simulation.simulationNumber,
        createdBy: simulation.createdBy,
        bprId: simulation.bprId,
        branchId: simulation.branchId,
        status: simulation.status,
      },
    },
    { status: 200 }
  );
}
