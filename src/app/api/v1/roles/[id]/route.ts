import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/rbac";
import { RoleRepository, isSystemRole } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateRoleSchema = z.object({
  name: z.string().min(2, "Nama role minimal 2 karakter").optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/v1/roles/:id
 *
 * Retrieves role details and assigned permissions.
 * Permission: ROLE_VIEW (Super Admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "ROLE_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const { id } = params;
  const role = await RoleRepository.findById(id);

  if (!role) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Role tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: role }, { status: 200 });
}

/**
 * PATCH /api/v1/roles/:id
 *
 * Updates role name, description, or active status.
 * Permission: ROLE_UPDATE (Super Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "ROLE_UPDATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  const existingRole = await RoleRepository.findById(id);
  if (!existingRole) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Role tidak ditemukan.",
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

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data update role tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // System role protection: Cannot deactivate core system roles
  if (isSystemRole(existingRole.code) && data.isActive === false) {
    return NextResponse.json(
      {
        error: {
          code: "SYSTEM_ROLE_PROTECTED",
          message: `Role sistem '${existingRole.code}' tidak boleh dinonaktifkan.`,
        },
      },
      { status: 400 }
    );
  }

  try {
    const updatedRole = await RoleRepository.update(id, {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
    });

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "ROLE_UPDATE",
      entityType: "Role",
      entityId: id,
      oldValue: {
        name: existingRole.name,
        description: existingRole.description,
        isActive: existingRole.isActive,
      },
      newValue: {
        name: updatedRole.name,
        description: updatedRole.description,
        isActive: updatedRole.isActive,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Role berhasil diperbarui.",
        data: updatedRole,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Roles API] Update error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal memperbarui role.",
        },
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/v1/roles/:id
 *
 * Deletes a custom role.
 * Permission: ROLE_DELETE (Super Admin only)
 * System roles (SUPER_ADMIN, ADMIN, MARKETING) and roles in use cannot be deleted.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "ROLE_DELETE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  const existingRole = await RoleRepository.findById(id);
  if (!existingRole) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Role tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // System Role Protection
  if (isSystemRole(existingRole.code)) {
    return NextResponse.json(
      {
        error: {
          code: "SYSTEM_ROLE_PROTECTED",
          message: `Role sistem '${existingRole.code}' merupakan role inti dan tidak dapat dihapus.`,
        },
      },
      { status: 400 }
    );
  }

  try {
    await RoleRepository.delete(id);

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "ROLE_DELETE",
      entityType: "Role",
      entityId: id,
      oldValue: {
        code: existingRole.code,
        name: existingRole.name,
      },
      ipAddress,
      userAgent,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Roles API] Delete error:", error);
    return NextResponse.json(
      {
        error: {
          code: "DELETE_FAILED",
          message: error instanceof Error ? error.message : "Gagal menghapus role.",
        },
      },
      { status: 400 }
    );
  }
}
