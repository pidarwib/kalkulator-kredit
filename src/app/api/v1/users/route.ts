import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, DataScopeService, forbiddenResponse } from "@/lib/rbac";
import { UserRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const createUserSchema = z
  .object({
    username: z
      .string({ required_error: "Username wajib diisi" })
      .min(3, "Username minimal 3 karakter")
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Username hanya boleh berisi huruf, angka, underscore, titik, dan strip"
      ),
    email: z
      .string()
      .email("Format email tidak valid")
      .optional()
      .nullable()
      .or(z.literal("")),
    password: z
      .string({ required_error: "Password wajib diisi" })
      .min(8, "Password minimal 8 karakter"),
    fullName: z
      .string({ required_error: "Nama lengkap wajib diisi" })
      .min(2, "Nama lengkap minimal 2 karakter"),
    phone: z.string().optional().nullable().or(z.literal("")),
    roleId: z.string().optional(),
    roleCode: z.enum(["SUPER_ADMIN", "ADMIN", "MARKETING"]).optional(),
    bprId: z.string().optional().nullable(),
    branchId: z.string().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional().default("ACTIVE"),
  })
  .refine((data) => data.roleId || data.roleCode, {
    message: "Role ID atau Role Code wajib diisi",
    path: ["roleId"],
  });

/**
 * GET /api/v1/users
 *
 * Lists users with server-side pagination, search, filters, and data scope isolation.
 * Permission: USER_VIEW
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate & Authorize
  const auth = await requirePermission(request, "USER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { searchParams } = new URL(request.url);

  // 2. Parse Query Params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const search = searchParams.get("search") || undefined;
  const roleCode = searchParams.get("role") || searchParams.get("roleCode") || undefined;
  const status = searchParams.get("status") || undefined;
  const bprIdParam = searchParams.get("bprId") || undefined;
  const branchIdParam = searchParams.get("branchId") || undefined;

  // 3. Apply Data Scope where clause
  const baseWhere = DataScopeService.getUserWhere(caller);

  // Scope constraints for ADMIN
  const bprId = caller.role === "ADMIN" && caller.bprId ? caller.bprId : bprIdParam;
  const branchId = caller.role === "ADMIN" && caller.branchId ? caller.branchId : branchIdParam;

  try {
    const result = await UserRepository.findManyWithPagination({
      page: isNaN(page) ? 1 : page,
      pageSize: isNaN(pageSize) ? 20 : pageSize,
      search,
      roleCode,
      status,
      bprId,
      branchId,
      baseWhere,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[Users API] List error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil daftar pengguna.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/users
 *
 * Creates a new user record.
 * Permission: USER_CREATE
 * Enforces role assignment privilege rules and data scope boundaries.
 */
export async function POST(request: NextRequest) {
  // 1. Authenticate & Authorize
  const auth = await requirePermission(request, "USER_CREATE");
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

  // 2. Validate payload schema
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data pengguna yang dimasukkan tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 3. Resolve Target Role
  let targetRole;
  if (data.roleId) {
    targetRole = await db.role.findUnique({ where: { id: data.roleId } });
  } else if (data.roleCode) {
    targetRole = await db.role.findUnique({ where: { code: data.roleCode } });
  }

  if (!targetRole) {
    return NextResponse.json(
      {
        error: {
          code: "ROLE_NOT_FOUND",
          message: "Role yang dipilih tidak valid atau tidak ditemukan.",
        },
      },
      { status: 400 }
    );
  }

  // 4. Privilege Escalation & Role Assignment Checks
  if (caller.role === "ADMIN") {
    // Admin can ONLY create MARKETING users
    if (targetRole.code !== "MARKETING") {
      return forbiddenResponse(
        "Admin hanya memiliki wewenang untuk membuat akun dengan role MARKETING."
      );
    }

    // Admin scope enforcement: Target user must be within caller's BPR / Branch
    if (caller.bprId && data.bprId && data.bprId !== caller.bprId) {
      return forbiddenResponse(
        "Admin tidak dapat menugaskan user ke BPR di luar penugasan Anda."
      );
    }
    if (caller.branchId && data.branchId && data.branchId !== caller.branchId) {
      return forbiddenResponse(
        "Admin tidak dapat menugaskan user ke cabang di luar penugasan Anda."
      );
    }
  }

  // 5. Check Username Uniqueness
  const existingUsername = await UserRepository.findByUsername(data.username, true);
  if (existingUsername) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Username '${data.username}' sudah digunakan.`,
        },
      },
      { status: 409 }
    );
  }

  // 6. Check Email Uniqueness (if provided)
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : null;
  if (cleanEmail) {
    const existingEmail = await UserRepository.findByEmail(cleanEmail, true);
    if (existingEmail) {
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

  // 7. Resolve assigned BPR / Branch
  const finalBprId =
    caller.role === "ADMIN" ? caller.bprId : data.bprId || null;
  const finalBranchId =
    caller.role === "ADMIN" && caller.branchId ? caller.branchId : data.branchId || null;

  try {
    const newUser = await UserRepository.create({
      username: data.username,
      email: cleanEmail || undefined,
      password: data.password,
      fullName: data.fullName,
      phone: data.phone || undefined,
      roleId: targetRole.id,
      bprId: finalBprId || undefined,
      branchId: finalBranchId || undefined,
      status: data.status,
    });

    // 8. Record Audit Log for sensitive action
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "USER_CREATE",
      entityType: "User",
      entityId: newUser.id,
      newValue: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: targetRole.code,
        bprId: newUser.bprId,
        branchId: newUser.branchId,
        status: newUser.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Pengguna berhasil dibuat.",
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Users API] Create error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            error instanceof Error ? error.message : "Gagal membuat pengguna.",
        },
      },
      { status: 400 }
    );
  }
}
