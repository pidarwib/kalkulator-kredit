import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { RoleRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/permissions
 *
 * Lists all available canonical permissions, optionally filtered by module.
 * Permission: PERMISSION_VIEW (Super Admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "PERMISSION_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module") || undefined;

  try {
    const permissions = await RoleRepository.listPermissions(moduleParam);
    return NextResponse.json({ data: permissions }, { status: 200 });
  } catch (error) {
    console.error("[Permissions API] List error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil data permission.",
        },
      },
      { status: 500 }
    );
  }
}
