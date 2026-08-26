import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { ProductRepository, CreditParameterRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createParameterVersionSchema = z.object({
  maximumAgeYears: z
    .number({ required_error: "Batas usia maksimal (tahun) wajib diisi" })
    .int("Batas usia harus berupa bilangan bulat")
    .min(18, "Batas usia minimal 18 tahun")
    .max(100, "Batas usia maksimal 100 tahun"),
  maximumAgeMonths: z
    .number()
    .int("Bulan usia harus berupa bilangan bulat")
    .min(0)
    .max(11)
    .optional()
    .default(0),
  maximumTenorMonths: z
    .number({ required_error: "Batas tenor maksimal (bulan) wajib diisi" })
    .int("Tenor harus berupa bilangan bulat")
    .min(1, "Tenor minimal 1 bulan")
    .max(360, "Tenor maksimal 360 bulan (30 tahun)"),
  maximumPrincipal: z
    .union([z.number(), z.string()])
    .refine((val) => Number(val) > 0, "Plafon maksimal harus lebih dari 0"),
  maximumDbr: z
    .union([z.number(), z.string()])
    .refine(
      (val) => Number(val) > 0 && Number(val) <= 1.0,
      "DBR maksimal harus di antara 0 dan 1.00 (misal: 0.90 untuk 90%)"
    ),
  flatAnnualRate: z
    .union([z.number(), z.string()])
    .refine(
      (val) => Number(val) > 0 && Number(val) <= 1.0,
      "Suku bunga tahunan flat harus di antara 0 dan 1.00 (misal: 0.108 untuk 10.8%)"
    ),
  flatMonthlyRate: z.union([z.number(), z.string()]).optional(),
  principalRoundingIncrement: z.union([z.number(), z.string()]).optional().default(100000),
  installmentDeductionPeriods: z.number().int().min(0).max(12).optional().default(2),
  effectiveFrom: z.string({ required_error: "Tanggal berlaku efektif wajib diisi" }),
  version: z.string().optional(),
  description: z.string().optional(),
});

/**
 * GET /api/v1/products/:id/credit-parameters/versions
 *
 * Lists all historical and active credit parameter versions for a product.
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

  // Admin Scope Check: Admin can only view parameters for products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== product.bprId) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat riwayat parameter produk pada BPR ini."
    );
  }

  try {
    const versions =
      await CreditParameterRepository.listVersionsByProductId(productId);

    const formatted = versions.map((p) => ({
      id: p.id,
      productId: p.productId,
      version: p.version,
      maximumAgeYears: p.maximumAgeYears,
      maximumAgeMonths: p.maximumAgeMonths,
      maximumTenorMonths: p.maximumTenorMonths,
      maximumPrincipal: Number(p.maximumPrincipal),
      maximumDbr: Number(p.maximumDbr),
      flatAnnualRate: Number(p.flatAnnualRate),
      flatMonthlyRate: Number(p.flatMonthlyRate),
      principalRoundingIncrement: Number(p.principalRoundingIncrement),
      installmentDeductionPeriods: p.installmentDeductionPeriods,
      effectiveFrom: p.effectiveFrom.toISOString(),
      effectiveTo: p.effectiveTo ? p.effectiveTo.toISOString() : null,
      isActive: p.isActive,
      createdBy: p.createdBy,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: formatted }, { status: 200 });
  } catch (error) {
    console.error("[CreditParameter API] Versions list error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil riwayat versi parameter kredit.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/products/:id/credit-parameters/versions
 *
 * Creates a new credit parameter version without overwriting historical records.
 * Permission: CREDIT_PARAMETER_CREATE (Super Admin, Admin for own BPR)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "CREDIT_PARAMETER_CREATE");
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

  // Admin Scope Check: Admin can only create parameter versions for products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== product.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat memperbarui versi parameter untuk produk pada BPR yang ditugaskan kepadanya."
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

  const parsed = createParameterVersionSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data parameter kredit tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate effectiveFrom date
  const effectiveDate = new Date(data.effectiveFrom);
  if (isNaN(effectiveDate.getTime())) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Format tanggal effectiveFrom tidak valid (harus ISO 8601 YYYY-MM-DD).",
        },
      },
      { status: 400 }
    );
  }

  try {
    const { newCreditParameter, previousCreditParameter } =
      await CreditParameterRepository.createNewVersion({
        productId,
        maximumAgeYears: data.maximumAgeYears,
        maximumAgeMonths: data.maximumAgeMonths,
        maximumTenorMonths: data.maximumTenorMonths,
        maximumPrincipal: data.maximumPrincipal,
        maximumDbr: data.maximumDbr,
        flatAnnualRate: data.flatAnnualRate,
        flatMonthlyRate: data.flatMonthlyRate,
        principalRoundingIncrement: data.principalRoundingIncrement,
        installmentDeductionPeriods: data.installmentDeductionPeriods,
        effectiveFrom: effectiveDate,
        version: data.version,
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
      action: "CREDIT_PARAMETER_CREATE",
      entityType: "CreditParameter",
      entityId: newCreditParameter.id,
      oldValue: previousCreditParameter
        ? {
            id: previousCreditParameter.id,
            version: previousCreditParameter.version,
            flatAnnualRate: Number(previousCreditParameter.flatAnnualRate),
            maximumDbr: Number(previousCreditParameter.maximumDbr),
            maximumPrincipal: Number(previousCreditParameter.maximumPrincipal),
          }
        : null,
      newValue: {
        id: newCreditParameter.id,
        version: newCreditParameter.version,
        flatAnnualRate: Number(newCreditParameter.flatAnnualRate),
        maximumDbr: Number(newCreditParameter.maximumDbr),
        maximumPrincipal: Number(newCreditParameter.maximumPrincipal),
        effectiveFrom: newCreditParameter.effectiveFrom.toISOString(),
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: `Versi parameter kredit '${newCreditParameter.version}' berhasil dibuat.`,
        data: {
          id: newCreditParameter.id,
          productId: newCreditParameter.productId,
          version: newCreditParameter.version,
          maximumAgeYears: newCreditParameter.maximumAgeYears,
          maximumAgeMonths: newCreditParameter.maximumAgeMonths,
          maximumTenorMonths: newCreditParameter.maximumTenorMonths,
          maximumPrincipal: Number(newCreditParameter.maximumPrincipal),
          maximumDbr: Number(newCreditParameter.maximumDbr),
          flatAnnualRate: Number(newCreditParameter.flatAnnualRate),
          flatMonthlyRate: Number(newCreditParameter.flatMonthlyRate),
          principalRoundingIncrement: Number(
            newCreditParameter.principalRoundingIncrement
          ),
          installmentDeductionPeriods:
            newCreditParameter.installmentDeductionPeriods,
          effectiveFrom: newCreditParameter.effectiveFrom.toISOString(),
          effectiveTo: newCreditParameter.effectiveTo
            ? newCreditParameter.effectiveTo.toISOString()
            : null,
          isActive: newCreditParameter.isActive,
          createdBy: newCreditParameter.createdBy,
          createdAt: newCreditParameter.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CreditParameter API] Create version error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Gagal membuat versi parameter kredit baru.",
        },
      },
      { status: 400 }
    );
  }
}
