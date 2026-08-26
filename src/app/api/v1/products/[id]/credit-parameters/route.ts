import { NextRequest, NextResponse } from "next/server";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { ProductRepository, CreditParameterRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products/:id/credit-parameters
 *
 * Retrieves the currently active credit parameters for a product.
 * Permission: CREDIT_PARAMETER_VIEW (Super Admin, Admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "CREDIT_PARAMETER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id: productId } = params;

  // 1. Fetch target product
  const product = await ProductRepository.findById(productId);
  if (!product) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Produk tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // 2. Data Scope Check: Admin can only view parameters for products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== product.bprId) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat parameter kredit pada BPR ini."
    );
  }

  try {
    const activeParameter =
      await CreditParameterRepository.findActiveByProductId(productId);

    if (!activeParameter) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Tidak ada parameter kredit aktif untuk produk ini.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: activeParameter.id,
          productId: activeParameter.productId,
          version: activeParameter.version,
          maximumAgeYears: activeParameter.maximumAgeYears,
          maximumAgeMonths: activeParameter.maximumAgeMonths,
          maximumTenorMonths: activeParameter.maximumTenorMonths,
          maximumPrincipal: Number(activeParameter.maximumPrincipal),
          maximumDbr: Number(activeParameter.maximumDbr),
          flatAnnualRate: Number(activeParameter.flatAnnualRate),
          flatMonthlyRate: Number(activeParameter.flatMonthlyRate),
          principalRoundingIncrement: Number(
            activeParameter.principalRoundingIncrement
          ),
          installmentDeductionPeriods:
            activeParameter.installmentDeductionPeriods,
          effectiveFrom: activeParameter.effectiveFrom.toISOString(),
          effectiveTo: activeParameter.effectiveTo
            ? activeParameter.effectiveTo.toISOString()
            : null,
          isActive: activeParameter.isActive,
          createdAt: activeParameter.createdAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CreditParameter API] Active lookup error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil parameter kredit aktif.",
        },
      },
      { status: 500 }
    );
  }
}
