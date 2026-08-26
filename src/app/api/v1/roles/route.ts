import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/rbac";
import { RoleRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createRoleSchema = z.object({
  code: z
    .string({ required_error: "Kode role wajib diisi" })
    .min(3, "Kode role minimal 3 karakter")
    .regex(/^[A-Z0-9_]+$/, "Kode role harus berupa huruf kapital, angka, dan underscore"),
  name: z
    .string({ required_error: "Nama role wajib diisi" })
    .min(2, "Nama role minimal 2 karakter"),
  description: z.string().optional().nullable(),
  permissionIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

/**
 * GET /api/v1/roles
 *
 * Lists all roles along with assigned permissions count and active users count.
 * Permission: ROLE_VIEW (Super Admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "ROLE_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  try {
    const roles = await RoleRepository.list();
    return NextResponse.json({ data: roles }, { status: 200 });
  } catch (error) {
    console.error("[Roles API] List error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil data role.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/roles
 *
 * Creates a new custom role.
 * Permission: ROLE_CREATE (Super Admin only)
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "ROLE_CREATE");
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

  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data role yang dimasukkan tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Check unique code
  const existingRole = await RoleRepository.findByCode(data.code);
  if (existingRole) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Role dengan kode '${data.code}' sudah terdaftar.`,
        },
      },
      { status: 409 }
    );
  }

  try {
    const newRole = await RoleRepository.create({
      code: data.code,
      name: data.name,
      description: data.description || undefined,
      permissionIds: data.permissionIds,
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
      action: "ROLE_CREATE",
      entityType: "Role",
      entityId: newRole.id,
      newValue: {
        code: newRole.code,
        name: newRole.name,
        description: newRole.description,
        permissionsCount: newRole.permissions.length,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Role berhasil dibuat.",
        data: newRole,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Roles API] Create error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal membuat role.",
        },
      },
      { status: 400 }
    );
  }
}
