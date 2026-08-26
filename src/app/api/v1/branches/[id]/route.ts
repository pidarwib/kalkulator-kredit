import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { BranchRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateBranchSchema = z.object({
  name: z.string().min(2, "Nama cabang minimal 2 karakter").optional(),
  address: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

/**
 * GET /api/v1/branches/:id
 *
 * Retrieves a single Branch details with relations.
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

  const branch = await BranchRepository.findById(id);
  if (!branch) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Cabang tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only view branches in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== branch.bprId) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat data cabang pada BPR ini."
    );
  }

  return NextResponse.json({ data: branch }, { status: 200 });
}

/**
 * PATCH /api/v1/branches/:id
 *
 * Updates branch details.
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

  const existingBranch = await BranchRepository.findById(id);
  if (!existingBranch) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Cabang tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only update branches in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== existingBranch.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat mengubah data cabang pada BPR yang ditugaskan kepadanya."
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

  const parsed = updateBranchSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data pembaruan cabang tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const updatedBranch = await BranchRepository.update(id, {
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
      action: "BRANCH_UPDATE",
      entityType: "Branch",
      entityId: id,
      oldValue: {
        name: existingBranch.name,
        address: existingBranch.address,
        status: existingBranch.status,
      },
      newValue: {
        name: updatedBranch.name,
        address: updatedBranch.address,
        status: updatedBranch.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Cabang berhasil diperbarui.",
        data: updatedBranch,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Branches API] Update error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal memperbarui cabang.",
        },
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/v1/branches/:id
 *
 * Soft deletes a branch.
 * Permission: MASTER_DELETE (Super Admin, Admin for own BPR)
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

  const existingBranch = await BranchRepository.findById(id);
  if (!existingBranch) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Cabang tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only delete branches in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== existingBranch.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat menghapus cabang pada BPR yang ditugaskan kepadanya."
    );
  }

  try {
    await BranchRepository.softDelete(id);

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "BRANCH_DELETE",
      entityType: "Branch",
      entityId: id,
      oldValue: {
        code: existingBranch.code,
        name: existingBranch.name,
        bprId: existingBranch.bprId,
      },
      ipAddress,
      userAgent,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Branches API] Delete error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal menghapus cabang.",
        },
      },
      { status: 500 }
    );
  }
}
