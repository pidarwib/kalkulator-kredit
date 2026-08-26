import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  AuthenticatedUserContext,
  unauthorizedResponse,
} from "@/lib/auth";
import { PermissionService } from "@/lib/rbac";

export interface AuthorizationResult {
  allowed: boolean;
  user?: AuthenticatedUserContext;
  errorResponse?: NextResponse;
}

/**
 * Standard 403 Forbidden response.
 * Used when user is authenticated but lacks the required permission.
 * Message is safe-to-send without revealing internal permission names.
 */
export function forbiddenResponse(
  message = "Anda tidak memiliki izin untuk mengakses resource ini."
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "FORBIDDEN",
        message,
      },
    },
    { status: 403 }
  );
}

/**
 * requirePermission()
 *
 * Server-side authorization guard that combines:
 * 1. Authentication check (401 if unauthenticated)
 * 2. Permission check  (403 if authenticated but lacks permission)
 * 3. Active account status validation
 *
 * Pattern:
 *   Authenticate → Check Permission → Continue / 403
 *
 * Usage in Route Handler:
 *   const result = await requirePermission(request, "USER_CREATE");
 *   if (!result.allowed) return result.errorResponse!;
 *   const user = result.user!;
 */
export async function requirePermission(
  request: NextRequest,
  requiredPermission: string
): Promise<AuthorizationResult> {
  // 1. Authenticate
  const user = await authenticateRequest(request);
  if (!user) {
    return {
      allowed: false,
      errorResponse: unauthorizedResponse(),
    };
  }

  // 2. Check permission server-side using PermissionService
  const hasPermission = PermissionService.hasPermission(
    user.permissions,
    requiredPermission,
    user.role
  );

  if (!hasPermission) {
    return {
      allowed: false,
      user,
      errorResponse: forbiddenResponse(),
    };
  }

  return { allowed: true, user };
}

/**
 * requireAnyPermission()
 *
 * Like requirePermission but grants access if the user has ANY one of the listed permissions.
 * Useful for endpoints accessible by multiple roles (e.g., SIMULATION_VIEW for Admin & Marketing).
 */
export async function requireAnyPermission(
  request: NextRequest,
  requiredPermissions: string[]
): Promise<AuthorizationResult> {
  const user = await authenticateRequest(request);
  if (!user) {
    return { allowed: false, errorResponse: unauthorizedResponse() };
  }

  const hasAny = PermissionService.hasAnyPermission(
    user.permissions,
    requiredPermissions,
    user.role
  );

  if (!hasAny) {
    return { allowed: false, user, errorResponse: forbiddenResponse() };
  }

  return { allowed: true, user };
}

/**
 * requireAllPermissions()
 *
 * Like requirePermission but requires ALL listed permissions to be present.
 */
export async function requireAllPermissions(
  request: NextRequest,
  requiredPermissions: string[]
): Promise<AuthorizationResult> {
  const user = await authenticateRequest(request);
  if (!user) {
    return { allowed: false, errorResponse: unauthorizedResponse() };
  }

  const hasAll = PermissionService.hasAllPermissions(
    user.permissions,
    requiredPermissions,
    user.role
  );

  if (!hasAll) {
    return { allowed: false, user, errorResponse: forbiddenResponse() };
  }

  return { allowed: true, user };
}
