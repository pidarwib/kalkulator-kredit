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
 * GET /api/v1/simulations/:id
 *
 * Retrieves comprehensive details for a credit simulation including inputs,
 * results, eligibility breakdowns, insurance, fees, versions, and full amortization schedule.
 *
 * Permission: SIMULATION_VIEW (Super Admin, Admin, Marketing)
 * Data Scope:
 * - MARKETING: Only own simulation (createdBy = caller.id)
 * - ADMIN: Simulation within caller's BPR (bprId = caller.bprId)
 * - SUPER_ADMIN: All simulations across all BPRs
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  // 1. Authentication & Permission Check
  const auth = await requirePermission(request, "SIMULATION_VIEW");
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
    // 2. Fetch simulation from database
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

    // 3. Data Scoping & Ownership Verification
    if (caller.role === "MARKETING") {
      if (simulation.createdBy !== caller.id) {
        return forbiddenResponse(
          "Anda tidak memiliki akses ke simulasi pengguna lain."
        );
      }
    } else if (caller.role === "ADMIN") {
      if (caller.bprId && simulation.bprId !== caller.bprId) {
        return forbiddenResponse(
          "Anda tidak memiliki akses ke simulasi BPR lain."
        );
      }
    }

    // 4. Format detailed response payload
    const resultSnapshot = (simulation.resultSnapshot as any) || {};

    const schedule = (simulation.amortizationSchedules || []).map((item) => ({
      period: item.periodNumber,
      paymentDate: item.paymentDate
        ? item.paymentDate.toISOString().split("T")[0]
        : null,
      openingBalance: item.openingBalance.toNumber(),
      principalPortion: item.principalPayment.toNumber(),
      interestPortion: item.marginPayment.toNumber(),
      installment: item.installment.toNumber(),
      closingBalance: item.closingBalance.toNumber(),
    }));

    const reasons =
      simulation.eligibilityReasons && simulation.eligibilityReasons.length > 0
        ? simulation.eligibilityReasons.map((r) => r.message)
        : resultSnapshot.reasons || [];

    const formattedData = {
      id: simulation.id,
      simulationNumber: simulation.simulationNumber,
      status: simulation.status,
      customerName: simulation.customerName,
      customerNip: simulation.customerNip,
      calculationMethod: simulation.calculationMethod,
      businessRuleVersion: simulation.businessRuleVersion,
      parameterVersion: simulation.parameterVersion,
      createdAt: simulation.createdAt,
      updatedAt: simulation.updatedAt,
      user: simulation.user,
      bpr: simulation.bpr,
      branch: simulation.branch,
      paymentOffice: simulation.paymentOffice,
      product: simulation.product,
      input: simulation.inputSnapshot,
      result: resultSnapshot.result || (simulation.calculationResult ? {
        maximumPrincipal: simulation.calculationResult.maxPrincipalFinal.toNumber(),
        installment: simulation.calculationResult.installment.toNumber(),
        dbr: simulation.calculationResult.dbr.toNumber(),
        remainingSalary: simulation.calculationResult.remainingSalary.toNumber(),
        totalFees: simulation.calculationResult.totalFees.toNumber(),
        flaggingFee: simulation.calculationResult.flaggingFee.toNumber(),
        payoffAmount: simulation.calculationResult.payoffAmount.toNumber(),
        netDisbursement: simulation.calculationResult.netDisbursement.toNumber(),
      } : null),
      breakdown: resultSnapshot.breakdown || null,
      insurance: resultSnapshot.insurance || (simulation.calculationResult ? {
        rate: simulation.calculationResult.insuranceRate.toNumber(),
        premium: simulation.calculationResult.premium.toNumber(),
        fronting: simulation.calculationResult.frontingFee.toNumber(),
        reserve: simulation.calculationResult.reserve.toNumber(),
      } : null),
      fees: resultSnapshot.fees || (simulation.calculationResult ? {
        admin: simulation.calculationResult.adminFee.toNumber(),
        provision: simulation.calculationResult.provisionFee.toNumber(),
        verification: simulation.calculationResult.verificationFee.toNumber(),
        flagging: simulation.calculationResult.flaggingFee.toNumber(),
        installmentDeduction: simulation.calculationResult.installmentDeduction.toNumber(),
      } : null),
      versions: {
        businessRule: simulation.businessRuleVersion,
        parameter: simulation.parameterVersion,
      },
      reasons,
      warnings: resultSnapshot.warnings || [],
      schedule,
    };

    return NextResponse.json({ data: formattedData }, { status: 200 });
  } catch (error) {
    console.error("[Simulation Detail API] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan internal server saat mengambil detail simulasi.",
        },
      },
      { status: 500 }
    );
  }
}
