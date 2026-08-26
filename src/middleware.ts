import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/token";

// Define public endpoints that do not require authentication
const PUBLIC_API_PREFIXES = [
  "/api/v1/auth/login",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to protected API endpoints
  if (pathname.startsWith("/api/v1/")) {
    const isPublic = PUBLIC_API_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );

    if (!isPublic) {
      let token: string | null = null;
      const cookie = request.cookies.get(SESSION_COOKIE_NAME);
      if (cookie?.value) {
        token = cookie.value;
      } else {
        const authHeader = request.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7).trim();
        }
      }

      if (!token) {
        return NextResponse.json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Sesi tidak valid atau telah berakhir. Silakan login kembali.",
            },
          },
          { status: 401 }
        );
      }

      const session = await verifySessionToken(token);
      if (!session) {
        return NextResponse.json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Sesi tidak valid atau telah berakhir. Silakan login kembali.",
            },
          },
          { status: 401 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
