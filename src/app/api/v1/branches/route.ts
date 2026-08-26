import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { BranchRepository, BprRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createBranchSchema = z.object({
  bprId: z.string({ required_error: "BPR ID wajib diisi" }).uuid("Format BPR ID tidak valid"),
  code: z
    .string({ required_error: "Kode cabang wajib diisi" })
    .min(2, "Kode cabang minimal 2 karakter")
    .regex(/^[A-Z0-9_]+$/, "Kode cabang harus berupa huruf kapital, angka, dan underscore"),
  name: z
    .string({ required_error: "Nama cabang wajib diisi" })
    .min(2, "Nama cabang minimal 2 karakter"),
  address: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
});

/**
 * GET /api/v1/branches
 *
 * Lists branches with pagination and filters.
 * Permission: MASTER_VIEW (Super Admin, Admin)
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "MASTER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { searchParams } = new URL(request.url);

  let bprId = searchParams.get("bprId") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const pageSize = searchParams.get("pageSize")
    ? parseInt(searchParams.get("pageSize")!, 10)
    : 20;

  // Data scope enforcement for Admin
  if (caller.role === "ADMIN") {
    if (caller.bprId) {
      // Force filter to Admin's assigned BPR
      bprId = caller.bprId;
    }
  }

  try {
    const result = await BranchRepository.list({
      bprId,
      status,
      search,
      page,
      pageSize,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[Branches API] List error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil data cabang.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/branches
 *
 * Creates a new branch under a BPR.
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

  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data cabang yang dimasukkan tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Admin scope check: Admin can only create branches within their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== data.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat menambahkan cabang untuk BPR yang ditugaskan kepadanya."
    );
  }

  // Verify target BPR exists and is active
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

  // Check unique branch code within BPR
  const existingBranch = await BranchRepository.findByBprAndCode(
    data.bprId,
    data.code,
    true
  );
  if (existingBranch) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Cabang dengan kode '${data.code}' sudah terdaftar pada BPR ini.`,
        },
      },
      { status: 409 }
    );
  }

  try {
    const newBranch = await BranchRepository.create({
      bprId: data.bprId,
      code: data.code,
      name: data.name,
      address: data.address,
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
      action: "BRANCH_CREATE",
      entityType: "Branch",
      entityId: newBranch.id,
      newValue: {
        bprId: newBranch.bprId,
        code: newBranch.code,
        name: newBranch.name,
        status: newBranch.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Cabang berhasil dibuat.",
        data: newBranch,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Branches API] Create error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal membuat cabang.",
        },
      },
      { status: 400 }
    );
  }
}
