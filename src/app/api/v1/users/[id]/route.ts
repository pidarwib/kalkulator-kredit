import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, DataScopeService, forbiddenResponse } from "@/lib/rbac";
import { UserRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter").optional(),
  email: z
    .string()
    .email("Format email tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  password: z.string().min(8, "Password minimal 8 karakter").optional(),
  roleId: z.string().optional(),
  bprId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

/**
 * GET /api/v1/users/:id
 *
 * Retrieves single user details with data scope check.
 * Permission: USER_VIEW
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate & Authorize
  const auth = await requirePermission(request, "USER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  // 2. Fetch target user
  const targetUser = await UserRepository.findById(id);
  if (!targetUser) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Pengguna tidak ditemukan atau telah dihapus.",
        },
      },
      { status: 404 }
    );
  }

  // 3. Enforce Data Scope
  const canAccess = DataScopeService.canAccessUser(caller, {
    id: targetUser.id,
    bprId: targetUser.bprId,
    branchId: targetUser.branchId,
    roleCode: targetUser.role?.code,
  });

  if (!canAccess) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat data pengguna ini."
    );
  }

  return NextResponse.json({ data: targetUser }, { status: 200 });
}

/**
 * PATCH /api/v1/users/:id
 *
 * Updates user attributes, status, role, or credentials.
 * Permission: USER_UPDATE
 * Prevents privilege escalation and enforces scope validation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate & Authorize
  const auth = await requirePermission(request, "USER_UPDATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  // 2. Fetch existing user
  const existingUser = await UserRepository.findById(id);
  if (!existingUser) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Pengguna tidak ditemukan atau telah dihapus.",
        },
      },
      { status: 404 }
    );
  }

  // 3. Enforce Data Scope
  const canAccess = DataScopeService.canAccessUser(caller, {
    id: existingUser.id,
    bprId: existingUser.bprId,
    branchId: existingUser.branchId,
    roleCode: existingUser.role?.code,
  });

  if (!canAccess) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk mengubah data pengguna ini."
    );
  }

  // 4. Parse request body
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

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data pembaruan tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 5. Privilege Escalation & Role Update Checks
  if (data.roleId && data.roleId !== existingUser.roleId) {
    // If caller is Admin
    if (caller.role === "ADMIN") {
      // Admin cannot change self role
      if (caller.id === existingUser.id) {
        return forbiddenResponse(
          "Anda tidak diperbolehkan mengubah role akun Anda sendiri."
        );
      }

      // Check target role
      const newRole = await db.role.findUnique({ where: { id: data.roleId } });
      if (!newRole || newRole.code !== "MARKETING") {
        return forbiddenResponse(
          "Admin tidak memiliki izin untuk menetapkan role selain MARKETING."
        );
      }
    }
  }

  // Admin cannot move users outside their assigned BPR / Branch
  if (caller.role === "ADMIN") {
    if (data.bprId && caller.bprId && data.bprId !== caller.bprId) {
      return forbiddenResponse(
        "Admin tidak dapat memindahkan pengguna ke BPR lain."
      );
    }
    if (data.branchId && caller.branchId && data.branchId !== caller.branchId) {
      return forbiddenResponse(
        "Admin tidak dapat memindahkan pengguna ke cabang lain."
      );
    }
  }

  // 6. Check unique email if changing
  const cleanEmail =
    data.email !== undefined
      ? data.email
        ? data.email.trim().toLowerCase()
        : null
      : undefined;

  if (cleanEmail && cleanEmail !== existingUser.email) {
    const emailConflict = await UserRepository.findByEmail(cleanEmail, true);
    if (emailConflict && emailConflict.id !== id) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: `Email '${cleanEmail}' sudah terdaftar pada pengguna lain.`,
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    const updatedUser = await UserRepository.update(id, {
      fullName: data.fullName,
      email: cleanEmail,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
      password: data.password,
      roleId: data.roleId,
      bprId: data.bprId,
      branchId: data.branchId,
      status: data.status,
    });

    // 7. Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    let auditAction = "USER_UPDATE";
    if (data.status && data.status !== existingUser.status) {
      auditAction = data.status === "ACTIVE" ? "USER_ACTIVATE" : "USER_DEACTIVATE";
    } else if (data.password) {
      auditAction = "USER_PASSWORD_RESET";
    }

    await AuditService.record({
      userId: caller.id,
      action: auditAction,
      entityType: "User",
      entityId: id,
      oldValue: {
        fullName: existingUser.fullName,
        email: existingUser.email,
        phone: existingUser.phone,
        roleId: existingUser.roleId,
        bprId: existingUser.bprId,
        branchId: existingUser.branchId,
        status: existingUser.status,
      },
      newValue: {
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        roleId: updatedUser.roleId,
        bprId: updatedUser.bprId,
        branchId: updatedUser.branchId,
        status: updatedUser.status,
        passwordChanged: !!data.password,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Pengguna berhasil diperbarui.",
        data: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Users API] Update error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            error instanceof Error ? error.message : "Gagal memperbarui pengguna.",
        },
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/v1/users/:id
 *
 * Performs soft delete on a user record.
 * Permission: USER_DELETE (Super Admin only)
 * Prevents self-deletion.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate & Authorize
  const auth = await requirePermission(request, "USER_DELETE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  // 2. Prevent self-deletion
  if (caller.id === id) {
    return NextResponse.json(
      {
        error: {
          code: "CANNOT_DELETE_SELF",
          message: "Anda tidak dapat menghapus akun Anda sendiri.",
        },
      },
      { status: 400 }
    );
  }

  // 3. Fetch existing user
  const existingUser = await UserRepository.findById(id);
  if (!existingUser) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Pengguna tidak ditemukan atau sudah dihapus.",
        },
      },
      { status: 404 }
    );
  }

  try {
    // 4. Soft Delete
    await UserRepository.softDelete(id);

    // 5. Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "USER_DELETE",
      entityType: "User",
      entityId: id,
      oldValue: {
        username: existingUser.username,
        fullName: existingUser.fullName,
        role: existingUser.role?.code,
        status: existingUser.status,
      },
      ipAddress,
      userAgent,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Users API] Delete error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal menghapus pengguna.",
        },
      },
      { status: 500 }
    );
  }
}
