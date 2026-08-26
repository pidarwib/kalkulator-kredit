import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { BprRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createBprSchema = z.object({
  code: z
    .string({ required_error: "Kode BPR wajib diisi" })
    .min(3, "Kode BPR minimal 3 karakter")
    .regex(/^[A-Z0-9_]+$/, "Kode BPR harus berupa huruf kapital, angka, dan underscore"),
  name: z
    .string({ required_error: "Nama BPR wajib diisi" })
    .min(2, "Nama BPR minimal 2 karakter"),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
});

/**
 * GET /api/v1/bprs
 *
 * Lists all BPRs.
 * Permission: MASTER_VIEW (Super Admin, Admin)
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "MASTER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;

  try {
    let bprs = await BprRepository.list({ search, status });

    // Scope isolation: If caller is ADMIN and assigned to a specific BPR, restrict to that BPR
    if (caller.role === "ADMIN" && caller.bprId) {
      bprs = bprs.filter((bpr) => bpr.id === caller.bprId);
    }

    return NextResponse.json({ data: bprs }, { status: 200 });
  } catch (error) {
    console.error("[BPR API] List error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil data BPR.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/bprs
 *
 * Creates a new BPR entity.
 * Permission: MASTER_CREATE (Super Admin only for top-level BPR creation)
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "MASTER_CREATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;

  // Scope rule: Only SUPER_ADMIN can create top-level BPR organizations
  if (caller.role !== "SUPER_ADMIN") {
    return forbiddenResponse(
      "Hanya SUPER_ADMIN yang memiliki wewenang untuk menambahkan entitas BPR baru."
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

  const parsed = createBprSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data BPR yang dimasukkan tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Check unique BPR code
  const existingBpr = await BprRepository.findByCode(data.code, true);
  if (existingBpr) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `BPR dengan kode '${data.code}' sudah terdaftar.`,
        },
      },
      { status: 409 }
    );
  }

  try {
    const newBpr = await BprRepository.create({
      code: data.code,
      name: data.name,
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
      action: "BPR_CREATE",
      entityType: "Bpr",
      entityId: newBpr.id,
      newValue: {
        code: newBpr.code,
        name: newBpr.name,
        status: newBpr.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "BPR berhasil dibuat.",
        data: newBpr,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[BPR API] Create error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal membuat BPR.",
        },
      },
      { status: 400 }
    );
  }
}
