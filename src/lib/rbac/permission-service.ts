import { db } from "@/lib/db";

export type RoleCode = "SUPER_ADMIN" | "ADMIN" | "MARKETING";

/**
 * Canonical permission codes strictly defined in ROLE_PERMISSION.md
 */
export const CANONICAL_PERMISSIONS = [
  // Authentication
  "AUTH_LOGIN",
  "AUTH_LOGOUT",
  "AUTH_CHANGE_PASSWORD",
  "AUTH_RESET_PASSWORD",
  "PROFILE_VIEW",
  "PROFILE_UPDATE",
  // User Management
  "USER_VIEW",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DELETE",
  "USER_ACTIVATE",
  "USER_DEACTIVATE",
  "USER_RESET_PASSWORD",
  "USER_ASSIGN_ROLE",
  // Role & Permission Management
  "ROLE_VIEW",
  "ROLE_CREATE",
  "ROLE_UPDATE",
  "ROLE_DELETE",
  "PERMISSION_VIEW",
  "ROLE_PERMISSION_ASSIGN",
  // Credit Calculator
  "CREDIT_CALCULATE",
  "CREDIT_VIEW_RESULT",
  "CREDIT_EXPORT",
  // Simulation
  "SIMULATION_VIEW",
  "SIMULATION_CREATE",
  "SIMULATION_UPDATE",
  "SIMULATION_DELETE",
  "SIMULATION_EXPORT",
  // Master Data
  "MASTER_VIEW",
  "MASTER_CREATE",
  "MASTER_UPDATE",
  "MASTER_DELETE",
  // Credit Parameters
  "CREDIT_PARAMETER_VIEW",
  "CREDIT_PARAMETER_CREATE",
  "CREDIT_PARAMETER_UPDATE",
  "CREDIT_PARAMETER_DELETE",
  // Reports
  "REPORT_VIEW",
  "REPORT_EXPORT",
  // Audit Trail
  "AUDIT_VIEW",
  "AUDIT_EXPORT",
] as const;

export type PermissionCode = (typeof CANONICAL_PERMISSIONS)[number];

export interface RoleWithPermissions {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: {
    id: string;
    code: string;
    name: string;
    module: string;
  }[];
}

export class PermissionService {
  /**
   * Retrieves all permissions, optionally filtered by module.
   */
  static async listPermissions(module?: string) {
    return db.permission.findMany({
      where: module ? { module: module.toUpperCase() } : undefined,
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });
  }

  /**
   * Retrieves all roles with their assigned permissions.
   */
  static async listRoles(includePermissions = true): Promise<RoleWithPermissions[]> {
    const roles = await db.role.findMany({
      orderBy: { code: "asc" },
      include: includePermissions
        ? {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          }
        : undefined,
    });

    return roles.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      permissions: r.rolePermissions
        ? r.rolePermissions.map((rp: any) => ({
            id: rp.permission.id,
            code: rp.permission.code,
            name: rp.permission.name,
            module: rp.permission.module,
          }))
        : [],
    }));
  }

  /**
   * Finds a role by its unique code.
   */
  static async getRoleByCode(code: string): Promise<RoleWithPermissions | null> {
    const role = await db.role.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
      })),
    };
  }

  /**
   * Retrieves active permission codes assigned to a specific role.
   */
  static async getPermissionsForRole(roleCodeOrId: string): Promise<string[]> {
    const role = await db.role.findFirst({
      where: {
        OR: [{ id: roleCodeOrId }, { code: roleCodeOrId.toUpperCase() }],
      },
      include: {
        rolePermissions: {
          include: {
            permission: { select: { code: true } },
          },
        },
      },
    });

    if (!role) return [];
    return role.rolePermissions.map((rp) => rp.permission.code);
  }

  /**
   * Checks if a user has a specific permission code.
   * Super Admins inherit all permissions.
   */
  static hasPermission(
    userPermissions: string[],
    requiredPermission: string,
    userRole?: string
  ): boolean {
    if (userRole === "SUPER_ADMIN") {
      return true;
    }
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Checks if a user has at least one of the specified permissions.
   */
  static hasAnyPermission(
    userPermissions: string[],
    requiredPermissions: string[],
    userRole?: string
  ): boolean {
    if (userRole === "SUPER_ADMIN") {
      return true;
    }
    return requiredPermissions.some((p) => userPermissions.includes(p));
  }

  /**
   * Checks if a user has all of the specified permissions.
   */
  static hasAllPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
    userRole?: string
  ): boolean {
    if (userRole === "SUPER_ADMIN") {
      return true;
    }
    return requiredPermissions.every((p) => userPermissions.includes(p));
  }

  /**
   * Validates if a permission code belongs to the canonical specification.
   */
  static isCanonicalPermission(code: string): boolean {
    return CANONICAL_PERMISSIONS.includes(code as PermissionCode);
  }
}
