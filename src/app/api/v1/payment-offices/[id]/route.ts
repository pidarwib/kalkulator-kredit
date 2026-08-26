import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { PaymentOfficeRepository, BranchRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updatePaymentOfficeSchema = z.object({
  branchId: z.string().uuid("Format Branch ID tidak valid").optional().nullable(),
  name: z.string().min(2, "Nama kantor bayar minimal 2 karakter").optional(),
  type: z.enum(["POS", "BANK", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

/**
 * GET /api/v1/payment-offices/:id
 *
 * Retrieves a single Payment Office with its BPR and Branch relations.
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

  const office = await PaymentOfficeRepository.findById(id);
  if (!office) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Kantor bayar tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only view payment offices in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== office.bprId) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat data kantor bayar pada BPR ini."
    );
  }

  return NextResponse.json({ data: office }, { status: 200 });
}

/**
 * PATCH /api/v1/payment-offices/:id
 *
 * Updates payment office details and validates branch relationship.
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

  const existingOffice = await PaymentOfficeRepository.findById(id);
  if (!existingOffice) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Kantor bayar tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only update payment offices in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== existingOffice.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat mengubah data kantor bayar pada BPR yang ditugaskan kepadanya."
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

  const parsed = updatePaymentOfficeSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data pembaruan kantor bayar tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate hierarchical relationship if changing branchId
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

    if (targetBranch.bprId !== existingOffice.bprId) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_RELATIONSHIP",
            message: "Cabang yang dipilih tidak terafiliasi dengan BPR kantor bayar ini (Hierarki BPR -> Branch tidak valid).",
          },
        },
        { status: 400 }
      );
    }
  }

  try {
    const updatedOffice = await PaymentOfficeRepository.update(id, {
      branchId: data.branchId,
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
      action: "PAYMENT_OFFICE_UPDATE",
      entityType: "PaymentOffice",
      entityId: id,
      oldValue: {
        branchId: existingOffice.branchId,
        name: existingOffice.name,
        type: existingOffice.type,
        status: existingOffice.status,
      },
      newValue: {
        branchId: updatedOffice.branchId,
        name: updatedOffice.name,
        type: updatedOffice.type,
        status: updatedOffice.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Kantor bayar berhasil diperbarui.",
        data: updatedOffice,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PaymentOffices API] Update error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal memperbarui kantor bayar.",
        },
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/v1/payment-offices/:id
 *
 * Soft deletes a payment office.
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

  const existingOffice = await PaymentOfficeRepository.findById(id);
  if (!existingOffice) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Kantor bayar tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only delete payment offices in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== existingOffice.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat menghapus kantor bayar pada BPR yang ditugaskan kepadanya."
    );
  }

  try {
    await PaymentOfficeRepository.softDelete(id);

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "PAYMENT_OFFICE_DELETE",
      entityType: "PaymentOffice",
      entityId: id,
      oldValue: {
        code: existingOffice.code,
        name: existingOffice.name,
        bprId: existingOffice.bprId,
      },
      ipAddress,
      userAgent,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PaymentOffices API] Delete error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal menghapus kantor bayar.",
        },
      },
      { status: 500 }
    );
  }
}
