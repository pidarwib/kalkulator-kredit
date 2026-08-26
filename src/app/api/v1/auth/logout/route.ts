import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getClearSessionCookieOptions,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    // If user was authenticated, record audit log
    if (user) {
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        null;
      const userAgent = request.headers.get("user-agent") || null;

      try {
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGOUT",
            entityType: "User",
            entityId: user.id,
            newValue: {
              username: user.username,
              timestamp: new Date().toISOString(),
            },
            ipAddress,
            userAgent,
          },
        });
      } catch (auditErr) {
        console.error("Audit log error on logout:", auditErr);
      }
    }

    // Prepare response with cleared cookie
    const clearOpts = getClearSessionCookieOptions();
    const response = new NextResponse(null, { status: 204 });

    response.cookies.set(clearOpts.name, clearOpts.value, {
      httpOnly: clearOpts.httpOnly,
      secure: clearOpts.secure,
      sameSite: clearOpts.sameSite,
      path: clearOpts.path,
      maxAge: clearOpts.maxAge,
    });

    return response;
  } catch (err) {
    console.error("Unhandled error in POST /api/v1/auth/logout:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada sistem saat memproses logout.",
        },
      },
      { status: 500 }
    );
  }
}
