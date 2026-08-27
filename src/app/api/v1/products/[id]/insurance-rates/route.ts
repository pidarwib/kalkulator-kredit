import { NextRequest, NextResponse } from "next/server";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { ProductRepository, InsuranceRateRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products/:id/insurance-rates
 *
 * Lists insurance rates for a product with pagination and filters.
 * Permission: MASTER_VIEW (Super Admin, Admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "MASTER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id: productId } = params;
  const { searchParams } = new URL(request.url);

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

  // Admin Scope Check: Admin can only view insurance rates for products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== product.bprId) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat tarif asuransi pada BPR ini."
    );
  }

  const age = searchParams.get("age") ? parseInt(searchParams.get("age")!, 10) : undefined;
  const tenorYears = searchParams.get("tenorYears")
    ? parseInt(searchParams.get("tenorYears")!, 10)
    : undefined;
  const version = searchParams.get("version") || undefined;
  const isActive = searchParams.get("isActive")
    ? searchParams.get("isActive") === "true"
    : undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const pageSize = searchParams.get("pageSize")
    ? parseInt(searchParams.get("pageSize")!, 10)
    : 50;

  try {
    const result = await InsuranceRateRepository.list({
      productId,
      age,
      tenorYears,
      version,
      isActive,
      page,
      pageSize,
    });

    const formatted = result.data.map((r) => ({
      id: r.id,
      productId: r.productId,
      age: r.age,
      tenorYears: r.tenorYears,
      premiumRate: Number(r.premiumRate),
      effectiveFrom: r.effectiveFrom.toISOString(),
      effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString() : null,
      version: r.version,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        data: formatted,
        meta: result.meta,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[InsuranceRates API] List error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil daftar tarif asuransi.",
        },
      },
      { status: 500 }
    );
  }
}
