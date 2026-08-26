import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/rbac";
import { RoleRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string(), {
    required_error: "Array permissionIds wajib disertakan",
  }),
});

/**
 * POST /api/v1/roles/:id/permissions
 *
 * Assigns / synchronizes permissions for a role.
 * Permission: ROLE_PERMISSION_ASSIGN (Super Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "ROLE_PERMISSION_ASSIGN");
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

  const parsed = assignPermissionsSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data permissions tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const { permissionIds } = parsed.data;

  // Safeguard: Do not allow emptying permissions of SUPER_ADMIN
  if (existingRole.code === "SUPER_ADMIN" && permissionIds.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_OPERATION",
          message: "Tidak dapat menghapus seluruh permission dari role SUPER_ADMIN.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const updatedRole = await RoleRepository.assignPermissions(id, permissionIds);

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "ROLE_PERMISSION_ASSIGN",
      entityType: "Role",
      entityId: id,
      oldValue: {
        roleCode: existingRole.code,
        previousCount: existingRole.permissions.length,
        previousPermissions: existingRole.permissions.map((p) => p.code),
      },
      newValue: {
        roleCode: updatedRole.code,
        newCount: updatedRole.permissions.length,
        newPermissions: updatedRole.permissions.map((p) => p.code),
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Permission role berhasil diperbarui.",
        data: updatedRole,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Roles API] Assign permissions error:", error);
    return NextResponse.json(
      {
        error: {
          code: "ASSIGN_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Gagal menetapkan permission ke role.",
        },
      },
      { status: 400 }
    );
  }
}
