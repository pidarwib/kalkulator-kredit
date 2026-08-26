import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          permissions: user.permissions,
          scope: user.scope,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unhandled error in GET /api/v1/auth/me:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada sistem saat mengambil profil pengguna.",
        },
      },
      { status: 500 }
    );
  }
}
