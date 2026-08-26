import { Prisma } from "@prisma/client";
import { AuthenticatedUserContext } from "@/lib/auth";

/**
 * Data Scope types according to ROLE_PERMISSION.md and SECURITY.md
 * - ALL: Super Admin can access all system data
 * - BRANCH / BPR: Admin can only access data within their assigned BPR / Branch
 * - OWN: Marketing can only access their own created records
 */
export type DataScope = "ALL" | "BRANCH" | "OWN";

export interface SimulationResource {
  id?: string;
  createdBy: string;
  bprId?: string | null;
  branchId?: string | null;
}

export interface UserResource {
  id: string;
  bprId?: string | null;
  branchId?: string | null;
  roleCode?: string | null;
}

export class DataScopeService {
  /**
   * Returns the data scope for an authenticated user context.
   */
  static getScope(user: AuthenticatedUserContext): DataScope {
    if (user.role === "SUPER_ADMIN") return "ALL";
    if (user.role === "ADMIN") return "BRANCH";
    return "OWN";
  }

  /**
   * Generates Prisma `where` clause for Simulation list queries based on user data scope.
   *
   * Rules:
   * - SUPER_ADMIN: No scope restrictions (returns all non-deleted simulations).
   * - ADMIN: Restricts to assigned BPR and Branch (if assigned).
   * - MARKETING: Restricts strictly to simulations created by this user (`createdBy = user.id`).
   */
  static getSimulationWhere(
    user: AuthenticatedUserContext
  ): Prisma.SimulationWhereInput {
    const baseWhere: Prisma.SimulationWhereInput = {
      deletedAt: null,
    };

    if (user.role === "SUPER_ADMIN") {
      return baseWhere;
    }

    if (user.role === "ADMIN") {
      const adminFilter: Prisma.SimulationWhereInput = {
        ...baseWhere,
      };

      if (user.bprId) {
        adminFilter.bprId = user.bprId;
      }
      if (user.branchId) {
        adminFilter.branchId = user.branchId;
      }

      return adminFilter;
    }

    // MARKETING (OWN scope)
    return {
      ...baseWhere,
      createdBy: user.id,
    };
  }

  /**
   * Generates Prisma `where` clause for User list queries based on user data scope.
   *
   * Rules:
   * - SUPER_ADMIN: Can view all users.
   * - ADMIN: Can view users in their BPR/Branch (excluding SUPER_ADMIN).
   * - MARKETING: Can only view their own user profile.
   */
  static getUserWhere(
    user: AuthenticatedUserContext
  ): Prisma.UserWhereInput {
    const baseWhere: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (user.role === "SUPER_ADMIN") {
      return baseWhere;
    }

    if (user.role === "ADMIN") {
      const adminFilter: Prisma.UserWhereInput = {
        ...baseWhere,
        role: {
          code: { not: "SUPER_ADMIN" },
        },
      };

      if (user.bprId) {
        adminFilter.bprId = user.bprId;
      }
      if (user.branchId) {
        adminFilter.branchId = user.branchId;
      }

      return adminFilter;
    }

    // MARKETING (OWN scope)
    return {
      ...baseWhere,
      id: user.id,
    };
  }

  /**
   * Validates if a user is authorized to access a specific simulation.
   * Prevents Insecure Direct Object Reference (IDOR).
   *
   * @param user - Authenticated user context
   * @param simulation - Target simulation resource metadata
   * @returns boolean - true if permitted, false if denied
   */
  static canAccessSimulation(
    user: AuthenticatedUserContext,
    simulation: SimulationResource
  ): boolean {
    // 1. Super Admin has unrestricted ALL scope
    if (user.role === "SUPER_ADMIN") {
      return true;
    }

    // 2. Marketing has strictly OWN scope (must be the creator)
    if (user.role === "MARKETING") {
      return simulation.createdBy === user.id;
    }

    // 3. Admin has BPR / BRANCH scope
    if (user.role === "ADMIN") {
      // If admin has a BPR assigned, simulation must belong to that BPR
      if (user.bprId && simulation.bprId && user.bprId !== simulation.bprId) {
        return false;
      }

      // If admin has a Branch assigned, simulation must belong to that Branch
      if (
        user.branchId &&
        simulation.branchId &&
        user.branchId !== simulation.branchId
      ) {
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Validates if a user is authorized to view or manage a target user.
   *
   * @param user - Authenticated caller context
   * @param targetUser - Target user metadata
   * @returns boolean - true if permitted, false if denied
   */
  static canAccessUser(
    user: AuthenticatedUserContext,
    targetUser: UserResource
  ): boolean {
    if (user.role === "SUPER_ADMIN") {
      return true;
    }

    if (user.role === "ADMIN") {
      // Admin cannot manage or inspect Super Admin accounts
      if (targetUser.roleCode === "SUPER_ADMIN") {
        return false;
      }

      // Admin can manage their own account
      if (user.id === targetUser.id) {
        return true;
      }

      // Must be within same BPR
      if (user.bprId && targetUser.bprId && user.bprId !== targetUser.bprId) {
        return false;
      }

      // If Admin has specific Branch, target must be in same Branch
      if (
        user.branchId &&
        targetUser.branchId &&
        user.branchId !== targetUser.branchId
      ) {
        return false;
      }

      return true;
    }

    // Marketing can only access their own user object
    return user.id === targetUser.id;
  }
}
