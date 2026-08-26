import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./cookies";
import { verifySessionToken, SessionPayload } from "./token";
import { validateUserStatus } from "./user-status";
import { db } from "@/lib/db";

export type UserScope = "ALL" | "BRANCH" | "OWN";

export interface AuthenticatedUserContext {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  roleId: string;
  bprId: string | null;
  branchId: string | null;
  permissions: string[];
  scope: UserScope;
}

/**
 * Determines the canonical data scope based on user role.
 */
export function getRoleDataScope(roleCode: string): UserScope {
  switch (roleCode) {
    case "SUPER_ADMIN":
      return "ALL";
    case "ADMIN":
      return "BRANCH";
    case "MARKETING":
    default:
      return "OWN";
  }
}

/**
 * Extracts and verifies the user session from cookies or Bearer Authorization header.
 * Performs database status and permission check.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUserContext | null> {
  // 1. Extract token from cookie or Authorization header
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
    return null;
  }

  // 2. Verify JWT signature & expiration
  const sessionPayload: SessionPayload | null = await verifySessionToken(token);
  if (!sessionPayload || !sessionPayload.userId) {
    return null;
  }

  // 3. Database verification to ensure account is still active and retrieve live permissions
  const user = await db.user.findUnique({
    where: { id: sessionPayload.userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
      bpr: true,
      branch: true,
    },
  });

  if (!user) {
    return null;
  }

  // 4. Validate user status (reject INACTIVE / SUSPENDED / soft-deleted)
  const statusCheck = validateUserStatus(user);
  if (!statusCheck.isAllowed) {
    return null;
  }

  // 5. Extract permission codes
  const permissions = user.role.rolePermissions.map((rp) => rp.permission.code);
  const scope = getRoleDataScope(user.role.code);

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role.code,
    roleId: user.role.id,
    bprId: user.bprId,
    branchId: user.branchId,
    permissions,
    scope,
  };
}

/**
 * Helper to produce standard 401 Unauthorized JSON response.
 */
export function unauthorizedResponse(
  message = "Sesi tidak valid atau telah berakhir. Silakan login kembali."
) {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHORIZED",
        message,
      },
    },
    { status: 401 }
  );
}
