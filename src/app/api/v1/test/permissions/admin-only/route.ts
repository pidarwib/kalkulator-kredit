import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/test/permissions/admin-only
 *
 * Demonstrates server-side authorization:
 * - 401 if unauthenticated
 * - 403 if authenticated but missing USER_VIEW permission
 * - 200 + user context if has USER_VIEW permission
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "USER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  return NextResponse.json(
    {
      message: "Akses berhasil. Anda memiliki izin USER_VIEW.",
      user: {
        id: auth.user!.id,
        username: auth.user!.username,
        role: auth.user!.role,
      },
    },
    { status: 200 }
  );
}
