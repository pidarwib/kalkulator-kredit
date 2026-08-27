import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { ProductRepository, InsuranceRateRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const rateItemSchema = z.object({
  age: z
    .number({ required_error: "Usia wajib diisi" })
    .int("Usia harus berupa bilangan bulat")
    .min(18, "Usia minimal 18")
    .max(100, "Usia maksimal 100"),
  tenorYears: z
    .number({ required_error: "Tenor tahun wajib diisi" })
    .int("Tenor tahun harus berupa bilangan bulat")
    .min(1, "Tenor tahun minimal 1")
    .max(30, "Tenor tahun maksimal 30"),
  premiumRate: z
    .union([z.number(), z.string()])
    .refine(
      (val) => Number(val) > 0 && Number(val) <= 1.0,
      "Tarif premi asuransi harus lebih dari 0 dan kurang dari sama dengan 1.00"
    ),
});

const importInsuranceRatesSchema = z.object({
  rates: z
    .array(rateItemSchema, { required_error: "Data tarif asuransi (rates) wajib diisi" })
    .min(1, "Data tarif asuransi tidak boleh kosong"),
  version: z.string().optional(),
  effectiveFrom: z.string().optional(),
  description: z.string().optional(),
});

/**
 * POST /api/v1/products/:id/insurance-rates/import
 *
 * Imports or updates insurance rates for a product in versioned batch.
 * Permission: MASTER_UPDATE (Super Admin, Admin for own BPR)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "MASTER_UPDATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id: productId } = params;

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

  // Admin Scope Check: Admin can only import rates for products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== product.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat mengimpor tarif asuransi untuk produk pada BPR yang ditugaskan kepadanya."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Format JSON request body tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  const parsed = importInsuranceRatesSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data tarif asuransi yang dimasukkan tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate duplicate age + tenor combinations within incoming payload
  const seenKeys = new Set<string>();
  for (const r of data.rates) {
    const key = `${r.age}-${r.tenorYears}`;
    if (seenKeys.has(key)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Terdapat duplikasi entri usia ${r.age} dan tenor ${r.tenorYears} tahun pada data yang diunggah.`,
          },
        },
        { status: 400 }
      );
    }
    seenKeys.add(key);
  }

  const effectiveFromDate = data.effectiveFrom
    ? new Date(data.effectiveFrom)
    : new Date();

  if (isNaN(effectiveFromDate.getTime())) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Format tanggal effectiveFrom tidak valid (harus ISO 8601).",
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await InsuranceRateRepository.createVersion({
      productId,
      rates: data.rates,
      version: data.version,
      effectiveFrom: effectiveFromDate,
      description: data.description,
      createdBy: caller.id,
    });

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "INSURANCE_RATE_IMPORT",
      entityType: "InsuranceRate",
      entityId: productId,
      newValue: {
        productId,
        version: result.version,
        cellCount: result.count,
        effectiveFrom: effectiveFromDate.toISOString(),
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: `Berhasil mengimpor ${result.count} data tarif asuransi versi '${result.version}'.`,
        data: {
          productId,
          version: result.version,
          importedCount: result.count,
          effectiveFrom: effectiveFromDate.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[InsuranceRates Import] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Gagal mengimpor data tarif asuransi.",
        },
      },
      { status: 400 }
    );
  }
}
