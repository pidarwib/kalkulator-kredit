import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requireAnyPermission, forbiddenResponse } from "@/lib/rbac";
import { PaymentOfficeRepository, BprRepository, BranchRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createPaymentOfficeSchema = z.object({
  bprId: z.string({ required_error: "BPR ID wajib diisi" }).uuid("Format BPR ID tidak valid"),
  branchId: z.string().uuid("Format Branch ID tidak valid").optional().nullable(),
  code: z
    .string({ required_error: "Kode kantor bayar wajib diisi" })
    .min(2, "Kode kantor bayar minimal 2 karakter")
    .regex(/^[A-Z0-9_]+$/, "Kode kantor bayar harus berupa huruf kapital, angka, dan underscore"),
  name: z
    .string({ required_error: "Nama kantor bayar wajib diisi" })
    .min(2, "Nama kantor bayar minimal 2 karakter"),
  type: z.enum(["POS", "BANK", "OTHER"]).optional().default("POS"),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
});

/**
 * GET /api/v1/payment-offices
 *
 * Lists payment offices with pagination and filters.
 * Permission: MASTER_VIEW or CREDIT_CALCULATE (Super Admin, Admin, Marketing)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAnyPermission(request, ["MASTER_VIEW", "CREDIT_CALCULATE"]);
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { searchParams } = new URL(request.url);

  let bprId = searchParams.get("bprId") || undefined;
  let branchId = searchParams.get("branchId") || undefined;
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const pageSize = searchParams.get("pageSize")
    ? parseInt(searchParams.get("pageSize")!, 10)
    : 20;

  // Data scope enforcement for Admin & Marketing
  if (caller.role !== "SUPER_ADMIN") {
    if (caller.bprId) {
      bprId = caller.bprId;
    }
    if (caller.branchId && !branchId) {
      branchId = caller.branchId;
    }
  }

  try {
    const result = await PaymentOfficeRepository.list({
      bprId,
      branchId,
      type,
      status,
      search,
      page,
      pageSize,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[PaymentOffices API] List error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil data kantor bayar.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/payment-offices
 *
 * Creates a new payment office.
 * Validates hierarchical relationship: BPR -> Branch -> Payment Office.
 * Permission: MASTER_CREATE (Super Admin, Admin for own BPR)
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "MASTER_CREATE");
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
          code: "VALIDATION_ERROR",
          message: "Format JSON request body tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  const parsed = createPaymentOfficeSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data kantor bayar yang dimasukkan tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Admin Scope Check: Admin can only create payment offices in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== data.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat menambahkan kantor bayar pada BPR yang ditugaskan kepadanya."
    );
  }

  // 1. Validate parent BPR exists
  const targetBpr = await BprRepository.findById(data.bprId);
  if (!targetBpr) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "BPR tujuan tidak ditemukan atau sudah tidak aktif.",
        },
      },
      { status: 404 }
    );
  }

  // 2. Validate hierarchical relationship: Branch must belong to the same BPR
  if (data.branchId) {
    const targetBranch = await BranchRepository.findById(data.branchId);
    if (!targetBranch) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Cabang tujuan tidak ditemukan atau sudah tidak aktif.",
          },
        },
        { status: 404 }
      );
    }

    if (targetBranch.bprId !== data.bprId) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_RELATIONSHIP",
            message: "Cabang yang dipilih tidak terafiliasi dengan BPR tersebut (Hierarki BPR -> Branch tidak valid).",
          },
        },
        { status: 400 }
      );
    }
  }

  // 3. Check unique code per BPR
  const existingOffice = await PaymentOfficeRepository.findByBprAndCode(
    data.bprId,
    data.code,
    true
  );
  if (existingOffice) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Kantor bayar dengan kode '${data.code}' sudah terdaftar pada BPR ini.`,
        },
      },
      { status: 409 }
    );
  }

  try {
    const newOffice = await PaymentOfficeRepository.create({
      bprId: data.bprId,
      branchId: data.branchId,
      code: data.code,
      name: data.name,
      type: data.type,
      status: data.status,
    });

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "PAYMENT_OFFICE_CREATE",
      entityType: "PaymentOffice",
      entityId: newOffice.id,
      newValue: {
        bprId: newOffice.bprId,
        branchId: newOffice.branchId,
        code: newOffice.code,
        name: newOffice.name,
        type: newOffice.type,
        status: newOffice.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Kantor bayar berhasil dibuat.",
        data: newOffice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[PaymentOffices API] Create error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal membuat kantor bayar.",
        },
      },
      { status: 400 }
    );
  }
}
