import { NextRequest, NextResponse } from "next/server";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { ProductRepository, FeeParameterRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products/:id/fee-parameters
 *
 * Retrieves the active FeeParameter for a product and optional payment office.
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
  const { searchParams } = new URL(request.url);
  const paymentOfficeId = searchParams.get("paymentOfficeId") || undefined;

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
      "Anda tidak memiliki hak akses untuk melihat parameter biaya pada BPR ini."
    );
  }

  try {
    const activeFee = await FeeParameterRepository.findActive(
      productId,
      paymentOfficeId
    );

    if (!activeFee) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Tidak ada parameter biaya aktif untuk produk ini.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: activeFee.id,
          productId: activeFee.productId,
          paymentOfficeId: activeFee.paymentOfficeId,
          version: activeFee.version,
          adminRate: Number(activeFee.adminRate),
          provisionRate: Number(activeFee.provisionRate),
          verificationFee: Number(activeFee.verificationFee),
          flaggingFee: Number(activeFee.flaggingFee),
          frontingRate: Number(activeFee.frontingRate),
          reserveRate: Number(activeFee.reserveRate),
          effectiveFrom: activeFee.effectiveFrom.toISOString(),
          effectiveTo: activeFee.effectiveTo
            ? activeFee.effectiveTo.toISOString()
            : null,
          isActive: activeFee.isActive,
          product: activeFee.product,
          paymentOffice: activeFee.paymentOffice,
          createdAt: activeFee.createdAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FeeParameter API] Active lookup error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil parameter biaya aktif.",
        },
      },
      { status: 500 }
    );
  }
}
