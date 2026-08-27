import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

/**
 * Middleware for Route Protection
 *
 * Rules:
 * 1. Unauthenticated users accessing frontend routes -> Redirect to /login?callbackUrl=...
 * 2. Authenticated users accessing /login -> Redirect to / (or callbackUrl)
 * 3. Unauthenticated users accessing protected /api/v1/* routes -> Return 401 JSON
 * 4. Backend API routes remain the authoritative security boundary for all RBAC and data scope enforcement.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Ignore static assets & Next.js internal files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1. Extract session token from cookie or Authorization header
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

  // 2. Verify token validity
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = !!session;

  // 3. Handle Login Page Route (/login)
  if (pathname === "/login") {
    if (isAuthenticated) {
      const callbackParam = request.nextUrl.searchParams.get("callbackUrl");
      const targetUrl = callbackParam && callbackParam.startsWith("/") && callbackParam !== "/login"
        ? callbackParam
        : "/";
      return NextResponse.redirect(new URL(targetUrl, request.url));
    }
    return NextResponse.next();
  }

  // 4. Handle API Routes (/api/v1/...)
  if (pathname.startsWith("/api/v1/")) {
    const isPublicApi = pathname === "/api/v1/auth/login";

    if (!isPublicApi && !isAuthenticated) {
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

    return NextResponse.next();
  }

  // 5. Handle Protected Frontend Pages
  if (!isAuthenticated) {
    const fullPath = `${pathname}${search}`;
    const loginUrl = new URL("/login", request.url);
    if (fullPath && fullPath !== "/") {
      loginUrl.searchParams.set("callbackUrl", fullPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
