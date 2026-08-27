import { NextRequest, NextResponse } from "next/server";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { ProductRepository, InsuranceRateRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products/:id/insurance-rates/lookup
 *
 * Looks up insurance rate by age and tenor.
 * STRICT: Returns 404 NOT_FOUND if rate is not in reference table (no AI estimation).
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

  // Admin Scope Check: Admin can only lookup insurance rates for products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== product.bprId) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat tarif asuransi pada BPR ini."
    );
  }

  const ageParam = searchParams.get("age");
  const tenorParam = searchParams.get("tenorYears");
  const dualLookup = searchParams.get("dualLookup") === "true"; // Current Age vs Next Age max rule

  if (!ageParam || !tenorParam) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Parameter 'age' dan 'tenorYears' wajib diisi.",
        },
      },
      { status: 400 }
    );
  }

  const age = parseInt(ageParam, 10);
  const tenorYears = parseInt(tenorParam, 10);

  if (isNaN(age) || isNaN(tenorYears)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Parameter 'age' dan 'tenorYears' harus berupa angka integer.",
        },
      },
      { status: 400 }
    );
  }

  try {
    if (dualLookup) {
      const dualResult = await InsuranceRateRepository.lookupMaxAgeRate(
        productId,
        age,
        tenorYears
      );

      if (!dualResult) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Tarif asuransi untuk usia ${age} (atau ${age + 1}) dengan tenor ${tenorYears} tahun tidak ditemukan dalam tabel referensi resmi.`,
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          data: {
            productId,
            currentAge: age,
            tenorYears,
            selectedRate: Number(dualResult.selectedRate),
            currentAgeRate: dualResult.currentAgeRate
              ? Number(dualResult.currentAgeRate.premiumRate)
              : null,
            nextAgeRate: dualResult.nextAgeRate
              ? Number(dualResult.nextAgeRate.premiumRate)
              : null,
          },
        },
        { status: 200 }
      );
    }

    const rate = await InsuranceRateRepository.lookup(productId, age, tenorYears);
    if (!rate) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Tarif asuransi untuk usia ${age} tahun dan tenor ${tenorYears} tahun tidak ditemukan dalam tabel tarif resmi.`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: rate.id,
          productId: rate.productId,
          age: rate.age,
          tenorYears: rate.tenorYears,
          premiumRate: Number(rate.premiumRate),
          version: rate.version,
          isActive: rate.isActive,
          effectiveFrom: rate.effectiveFrom.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[InsuranceRate Lookup] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal melakukan pencarian tarif asuransi.",
        },
      },
      { status: 500 }
    );
  }
}
