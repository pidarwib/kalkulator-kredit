import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { BprRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateBprSchema = z.object({
  name: z.string().min(2, "Nama BPR minimal 2 karakter").optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

/**
 * GET /api/v1/bprs/:id
 *
 * Retrieves a single BPR details with counts.
 * Permission: MASTER_VIEW
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
  const { id } = params;

  // Scope check for ADMIN
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== id) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat data BPR ini."
    );
  }

  const bpr = await BprRepository.findById(id);
  if (!bpr) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "BPR tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: bpr }, { status: 200 });
}

/**
 * PATCH /api/v1/bprs/:id
 *
 * Updates BPR name or active status.
 * Permission: MASTER_UPDATE
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "MASTER_UPDATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  // Scope check: Admin can only update their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== id) {
    return forbiddenResponse(
      "Admin hanya dapat mengubah data BPR yang menjadi penugasannya."
    );
  }

  const existingBpr = await BprRepository.findById(id);
  if (!existingBpr) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "BPR tidak ditemukan.",
        },
      },
      { status: 404 }
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

  const parsed = updateBprSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data pembaruan BPR tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const updatedBpr = await BprRepository.update(id, {
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
      action: "BPR_UPDATE",
      entityType: "Bpr",
      entityId: id,
      oldValue: {
        name: existingBpr.name,
        status: existingBpr.status,
      },
      newValue: {
        name: updatedBpr.name,
        status: updatedBpr.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "BPR berhasil diperbarui.",
        data: updatedBpr,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BPR API] Update error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal memperbarui BPR.",
        },
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/v1/bprs/:id
 *
 * Soft deletes a BPR entity.
 * Permission: MASTER_DELETE (Super Admin only for top-level BPR)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "MASTER_DELETE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  // Only Super Admin can delete top-level BPR organizations
  if (caller.role !== "SUPER_ADMIN") {
    return forbiddenResponse(
      "Hanya SUPER_ADMIN yang memiliki izin untuk menghapus entitas BPR."
    );
  }

  const existingBpr = await BprRepository.findById(id);
  if (!existingBpr) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "BPR tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  try {
    await BprRepository.softDelete(id);

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "BPR_DELETE",
      entityType: "Bpr",
      entityId: id,
      oldValue: {
        code: existingBpr.code,
        name: existingBpr.name,
        status: existingBpr.status,
      },
      ipAddress,
      userAgent,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[BPR API] Delete error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal menghapus BPR.",
        },
      },
      { status: 500 }
    );
  }
}
