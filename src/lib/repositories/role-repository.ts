import { db } from "@/lib/db";
import { Role, Permission, Prisma } from "@prisma/client";

export const SYSTEM_ROLE_CODES = ["SUPER_ADMIN", "ADMIN", "MARKETING"] as const;
export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

export function isSystemRole(code: string): boolean {
  return (SYSTEM_ROLE_CODES as readonly string[]).includes(code);
}

export interface RoleWithPermissions extends Role {
  permissions: {
    id: string;
    code: string;
    name: string;
    module: string;
    description: string | null;
  }[];
  _count?: {
    users: number;
    rolePermissions: number;
  };
}

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export class RoleRepository {
  /**
   * Lists all roles with permission counts and user counts.
   */
  static async list(): Promise<RoleWithPermissions[]> {
    const roles = await db.role.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            rolePermissions: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      ...role,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
        description: rp.permission.description,
      })),
    }));
  }

  /**
   * Finds a role by ID with all its assigned permissions.
   */
  static async findById(id: string): Promise<RoleWithPermissions | null> {
    const role = await db.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            rolePermissions: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      ...role,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
        description: rp.permission.description,
      })),
    };
  }

  /**
   * Finds a role by code.
   */
  static async findByCode(code: string): Promise<RoleWithPermissions | null> {
    const role = await db.role.findUnique({
      where: { code },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            rolePermissions: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      ...role,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
        description: rp.permission.description,
      })),
    };
  }

  /**
   * Creates a new custom role with optional initial permissions.
   */
  static async create(input: CreateRoleInput): Promise<RoleWithPermissions> {
    const code = input.code.trim().toUpperCase();

    const role = await db.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          code,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          isActive: input.isActive ?? true,
        },
      });

      if (input.permissionIds && input.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: input.permissionIds.map((permissionId) => ({
            roleId: created.id,
            permissionId,
          })),
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              users: true,
              rolePermissions: true,
            },
          },
        },
      });
    });

    return {
      ...role,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
        description: rp.permission.description,
      })),
    };
  }

  /**
   * Updates an existing role's basic details.
   */
  static async update(
    id: string,
    input: UpdateRoleInput
  ): Promise<RoleWithPermissions> {
    const data: Prisma.RoleUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const role = await db.role.update({
      where: { id },
      data,
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            rolePermissions: true,
          },
        },
      },
    });

    return {
      ...role,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
        description: rp.permission.description,
      })),
    };
  }

  /**
   * Deletes a role (prohibits deleting system roles or roles with assigned users).
   */
  static async delete(id: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { id },
        include: {
          _count: { select: { users: true } },
        },
      });

      if (!role) {
        throw new Error("Role tidak ditemukan.");
      }

      if (isSystemRole(role.code)) {
        throw new Error(`Role sistem '${role.code}' tidak dapat dihapus.`);
      }

      if (role._count.users > 0) {
        throw new Error(
          `Tidak dapat menghapus role yang masih digunakan oleh ${role._count.users} pengguna aktif.`
        );
      }

      // Delete associated role_permissions first then role
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
  }

  /**
   * Synchronizes permissions assigned to a role.
   */
  static async assignPermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<RoleWithPermissions> {
    const role = await db.$transaction(async (tx) => {
      const targetRole = await tx.role.findUnique({ where: { id: roleId } });
      if (!targetRole) {
        throw new Error("Role tidak ditemukan.");
      }

      // Verify all permissionIds exist
      const validPermissions = await tx.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
      });

      if (validPermissions.length !== permissionIds.length) {
        throw new Error("Satu atau lebih ID permission tidak valid.");
      }

      // Delete existing assignments
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Insert new assignments
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              users: true,
              rolePermissions: true,
            },
          },
        },
      });
    });

    return {
      ...role,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
        description: rp.permission.description,
      })),
    };
  }

  /**
   * Lists all available canonical permissions, optionally filtered by module.
   */
  static async listPermissions(module?: string): Promise<Permission[]> {
    const where: Prisma.PermissionWhereInput = {};
    if (module && module.trim().length > 0) {
      where.module = module.trim().toUpperCase();
    }

    return db.permission.findMany({
      where,
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });
  }
}
