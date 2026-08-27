import { NextRequest, NextResponse } from "next/server";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { AuditService } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  CreditCalculationOrchestrator,
  CalculationValidationError,
  MissingInsuranceRateError,
  FeeParameterNotFoundError,
} from "@/lib/calculation";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/calculations
 *
 * Core credit calculation endpoint.
 * Evaluates installments, capacity, insurance, fees, deductions, eligibility, and amortization.
 * Permission: CREDIT_CALCULATE
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "CREDIT_CALCULATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Format payload JSON tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  try {
    // 1. Data Scope Isolation Check
    if (body && typeof body === "object" && "productId" in body && typeof (body as { productId: unknown }).productId === "string") {
      const productId = (body as { productId: string }).productId;
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, bprId: true, status: true },
      });

      if (!product) {
        return NextResponse.json(
          {
            error: {
              code: "PRODUCT_NOT_FOUND",
              message: `Produk kredit dengan ID '${productId}' tidak ditemukan.`,
            },
          },
          { status: 404 }
        );
      }

      // Check tenant/BPR scope if caller is restricted
      if (caller.role !== "SUPER_ADMIN" && caller.bprId && product.bprId !== caller.bprId) {
        return forbiddenResponse(
          "Anda tidak memiliki akses untuk menghitung simulasi pada produk BPR lain."
        );
      }
    }

    // 2. Execute calculation orchestrator
    const result = await CreditCalculationOrchestrator.execute(body, caller.id);

    // 3. Audit Log
    await AuditService.record({
      userId: caller.id,
      action: "CREDIT_CALCULATE",
      entityType: "Calculation",
      entityId: result.calculationId,
      newValue: {
        calculationNumber: result.calculationNumber,
        productId: result.input.productId,
        requestedPrincipal: result.input.requestedPrincipal,
        tenorMonths: result.input.tenorMonths,
        method: result.calculationMethod,
        status: result.status,
        installment: result.result.installment,
        netDisbursement: result.result.netDisbursement,
      },
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof CalculationValidationError) {
      return NextResponse.json(
        {
          error: {
            code: "CALCULATION_VALIDATION_ERROR",
            message: error.message,
            details: error.details,
          },
        },
        { status: 422 }
      );
    }

    if (error instanceof MissingInsuranceRateError) {
      return NextResponse.json(
        {
          error: {
            code: "INSURANCE_RATE_NOT_FOUND",
            message: error.message,
            details: {
              productId: error.productId,
              age: error.age,
              tenorYears: error.tenorYears,
            },
          },
        },
        { status: 422 }
      );
    }

    if (error instanceof FeeParameterNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "FEE_PARAMETER_NOT_FOUND",
            message: error.message,
            details: {
              productId: error.productId,
              paymentOfficeId: error.paymentOfficeId,
            },
          },
        },
        { status: 422 }
      );
    }

    console.error("[Calculations API] Calculation Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan internal saat memproses perhitungan kredit.",
        },
      },
      { status: 500 }
    );
  }
}
