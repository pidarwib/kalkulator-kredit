import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import {
  ProductRepository,
  PaymentOfficeRepository,
  FeeParameterRepository,
} from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createFeeParameterVersionSchema = z.object({
  paymentOfficeId: z.string().uuid("Format Payment Office ID tidak valid").optional().nullable(),
  adminRate: z
    .union([z.number(), z.string()])
    .refine(
      (val) => Number(val) >= 0 && Number(val) <= 1.0,
      "Tarif admin harus di antara 0 dan 1.00 (misal: 0.01 untuk 1%)"
    )
    .optional()
    .default(0),
  provisionRate: z
    .union([z.number(), z.string()])
    .refine(
      (val) => Number(val) >= 0 && Number(val) <= 1.0,
      "Tarif provisi harus di antara 0 dan 1.00 (misal: 0.01 untuk 1%)"
    )
    .optional()
    .default(0),
  verificationFee: z
    .union([z.number(), z.string()])
    .refine((val) => Number(val) >= 0, "Biaya verifikasi minimal 0")
    .optional()
    .default(1500000),
  flaggingFee: z
    .union([z.number(), z.string()])
    .refine((val) => Number(val) >= 0, "Biaya flagging minimal 0")
    .optional()
    .default(38000),
  frontingRate: z
    .union([z.number(), z.string()])
    .refine(
      (val) => Number(val) >= 0 && Number(val) <= 1.0,
      "Tarif fronting harus di antara 0 dan 1.00"
    )
    .optional()
    .default(0),
  reserveRate: z
    .union([z.number(), z.string()])
    .refine(
      (val) => Number(val) >= 0 && Number(val) <= 1.0,
      "Tarif pencadangan (reserve) harus di antara 0 dan 1.00"
    )
    .optional()
    .default(0),
  effectiveFrom: z.string({ required_error: "Tanggal berlaku efektif wajib diisi" }),
  version: z.string().optional(),
  description: z.string().optional(),
});

/**
 * GET /api/v1/products/:id/fee-parameters/versions
 *
 * Lists all historical and active FeeParameter versions for a product.
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
      "Anda tidak memiliki hak akses untuk melihat riwayat parameter biaya pada BPR ini."
    );
  }

  try {
    const versions = await FeeParameterRepository.listVersions(
      productId,
      paymentOfficeId
    );

    const formatted = versions.map((f) => ({
      id: f.id,
      productId: f.productId,
      paymentOfficeId: f.paymentOfficeId,
      version: f.version,
      adminRate: Number(f.adminRate),
      provisionRate: Number(f.provisionRate),
      verificationFee: Number(f.verificationFee),
      flaggingFee: Number(f.flaggingFee),
      frontingRate: Number(f.frontingRate),
      reserveRate: Number(f.reserveRate),
      effectiveFrom: f.effectiveFrom.toISOString(),
      effectiveTo: f.effectiveTo ? f.effectiveTo.toISOString() : null,
      isActive: f.isActive,
      createdBy: f.createdBy,
      paymentOffice: f.paymentOffice,
      createdAt: f.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: formatted }, { status: 200 });
  } catch (error) {
    console.error("[FeeParameter API] Versions list error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil riwayat versi parameter biaya.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/products/:id/fee-parameters/versions
 *
 * Creates a new FeeParameter version without overwriting historical records.
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

  // Admin Scope Check: Admin can only create fee versions for products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== product.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat memperbarui versi parameter biaya untuk produk pada BPR yang ditugaskan kepadanya."
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

  const parsed = createFeeParameterVersionSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data parameter biaya tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate hierarchical relationship: PaymentOffice must belong to the product's BPR
  if (data.paymentOfficeId) {
    const targetOffice = await PaymentOfficeRepository.findById(data.paymentOfficeId);
    if (!targetOffice) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Kantor bayar tujuan tidak ditemukan.",
          },
        },
        { status: 404 }
      );
    }

    if (targetOffice.bprId !== product.bprId) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_RELATIONSHIP",
            message: "Kantor bayar yang dipilih tidak berada di bawah BPR yang sama dengan produk.",
          },
        },
        { status: 400 }
      );
    }
  }

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
    const { newFeeParameter, previousFeeParameter } =
      await FeeParameterRepository.createNewVersion({
        productId,
        paymentOfficeId: data.paymentOfficeId,
        adminRate: data.adminRate,
        provisionRate: data.provisionRate,
        verificationFee: data.verificationFee,
        flaggingFee: data.flaggingFee,
        frontingRate: data.frontingRate,
        reserveRate: data.reserveRate,
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
      action: "FEE_PARAMETER_CREATE",
      entityType: "FeeParameter",
      entityId: newFeeParameter.id,
      oldValue: previousFeeParameter
        ? {
            id: previousFeeParameter.id,
            version: previousFeeParameter.version,
            adminRate: Number(previousFeeParameter.adminRate),
            provisionRate: Number(previousFeeParameter.provisionRate),
            verificationFee: Number(previousFeeParameter.verificationFee),
            flaggingFee: Number(previousFeeParameter.flaggingFee),
          }
        : null,
      newValue: {
        id: newFeeParameter.id,
        version: newFeeParameter.version,
        paymentOfficeId: newFeeParameter.paymentOfficeId,
        adminRate: Number(newFeeParameter.adminRate),
        provisionRate: Number(newFeeParameter.provisionRate),
        verificationFee: Number(newFeeParameter.verificationFee),
        flaggingFee: Number(newFeeParameter.flaggingFee),
        effectiveFrom: newFeeParameter.effectiveFrom.toISOString(),
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: `Versi parameter biaya '${newFeeParameter.version}' berhasil dibuat.`,
        data: {
          id: newFeeParameter.id,
          productId: newFeeParameter.productId,
          paymentOfficeId: newFeeParameter.paymentOfficeId,
          version: newFeeParameter.version,
          adminRate: Number(newFeeParameter.adminRate),
          provisionRate: Number(newFeeParameter.provisionRate),
          verificationFee: Number(newFeeParameter.verificationFee),
          flaggingFee: Number(newFeeParameter.flaggingFee),
          frontingRate: Number(newFeeParameter.frontingRate),
          reserveRate: Number(newFeeParameter.reserveRate),
          effectiveFrom: newFeeParameter.effectiveFrom.toISOString(),
          effectiveTo: newFeeParameter.effectiveTo
            ? newFeeParameter.effectiveTo.toISOString()
            : null,
          isActive: newFeeParameter.isActive,
          createdBy: newFeeParameter.createdBy,
          createdAt: newFeeParameter.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[FeeParameter API] Create version error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Gagal membuat versi parameter biaya baru.",
        },
      },
      { status: 400 }
    );
  }
}
