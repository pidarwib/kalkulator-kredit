import { db } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { User, Prisma } from "@prisma/client";

export interface SafeUser {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  roleId: string;
  bprId: string | null;
  branchId: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  role?: {
    id: string;
    code: string;
    name: string;
  };
  bpr?: {
    id: string;
    code: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface CreateUserInput {
  username: string;
  email?: string;
  password: string;
  fullName: string;
  phone?: string;
  roleCode?: string;
  roleId?: string;
  bprId?: string;
  branchId?: string;
  status?: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  roleId?: string;
  bprId?: string;
  branchId?: string;
  status?: string;
}

export interface UserListFilter {
  roleId?: string;
  status?: string;
  bprId?: string;
  branchId?: string;
  includeDeleted?: boolean;
}

/**
 * Strips passwordHash and returns a SafeUser DTO.
 */
export function toSafeUser(
  user: User & {
    role?: { id: string; code: string; name: string };
    bpr?: { id: string; code: string; name: string } | null;
    branch?: { id: string; code: string; name: string } | null;
  }
): SafeUser {
  const { passwordHash: _hash, ...safe } = user;
  return safe;
}

export class UserRepository {
  /**
   * Finds a user by username (includes passwordHash for authentication).
   */
  static async findByUsernameWithSecret(
    username: string,
    includeDeleted = false
  ): Promise<
    | (User & {
        role: { id: string; code: string; name: string };
        bpr: { id: string; code: string; name: string } | null;
        branch: { id: string; code: string; name: string } | null;
      })
    | null
  > {
    const where: Prisma.UserWhereInput = {
      username: username.trim(),
    };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.user.findFirst({
      where,
      include: {
        role: { select: { id: true, code: true, name: true } },
        bpr: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });
  }

  /**
   * Finds a safe user by username (without passwordHash).
   */
  static async findByUsername(
    username: string,
    includeDeleted = false
  ): Promise<SafeUser | null> {
    const user = await this.findByUsernameWithSecret(username, includeDeleted);
    return user ? toSafeUser(user) : null;
  }

  /**
   * Finds a safe user by email.
   */
  static async findByEmail(
    email: string,
    includeDeleted = false
  ): Promise<SafeUser | null> {
    const where: Prisma.UserWhereInput = {
      email: email.trim().toLowerCase(),
    };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const user = await db.user.findFirst({
      where,
      include: {
        role: { select: { id: true, code: true, name: true } },
        bpr: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    return user ? toSafeUser(user) : null;
  }

  /**
   * Finds a safe user by ID.
   */
  static async findById(
    id: string,
    includeDeleted = false
  ): Promise<SafeUser | null> {
    const where: Prisma.UserWhereInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const user = await db.user.findFirst({
      where,
      include: {
        role: { select: { id: true, code: true, name: true } },
        bpr: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    return user ? toSafeUser(user) : null;
  }

  /**
   * Creates a new user with secure password hashing.
   */
  static async create(input: CreateUserInput): Promise<SafeUser> {
    // 1. Validate username
    const username = input.username.trim();
    if (username.length < 3) {
      throw new Error("Username minimal 3 karakter");
    }

    // 2. Validate password policy
    const pwdStrength = validatePasswordStrength(input.password);
    if (!pwdStrength.isValid) {
      throw new Error(pwdStrength.errors.join(", "));
    }

    // 3. Resolve roleId
    let roleId = input.roleId;
    if (!roleId && input.roleCode) {
      const role = await db.role.findUnique({
        where: { code: input.roleCode },
      });
      if (!role) {
        throw new Error(`Role tidak ditemukan: ${input.roleCode}`);
      }
      roleId = role.id;
    }
    if (!roleId) {
      throw new Error("Role ID atau Role Code wajib disertakan");
    }

    // 4. Hash password with Argon2id
    const passwordHash = await hashPassword(input.password);

    // 5. Create user record
    const user = await db.user.create({
      data: {
        username,
        email: input.email ? input.email.trim().toLowerCase() : null,
        passwordHash,
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() || null,
        roleId,
        bprId: input.bprId || null,
        branchId: input.branchId || null,
        status: input.status || "ACTIVE",
      },
      include: {
        role: { select: { id: true, code: true, name: true } },
        bpr: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    return toSafeUser(user);
  }

  /**
   * Updates an existing user record.
   */
  static async update(id: string, input: UpdateUserInput): Promise<SafeUser> {
    const updateData: Prisma.UserUpdateInput = {};

    if (input.email !== undefined) {
      updateData.email = input.email ? input.email.trim().toLowerCase() : null;
    }
    if (input.fullName !== undefined) {
      updateData.fullName = input.fullName.trim();
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone?.trim() || null;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.roleId !== undefined) {
      updateData.role = { connect: { id: input.roleId } };
    }
    if (input.bprId !== undefined) {
      updateData.bpr = input.bprId ? { connect: { id: input.bprId } } : { disconnect: true };
    }
    if (input.branchId !== undefined) {
      updateData.branch = input.branchId ? { connect: { id: input.branchId } } : { disconnect: true };
    }

    // If password is updated, validate and hash it
    if (input.password) {
      const pwdStrength = validatePasswordStrength(input.password);
      if (!pwdStrength.isValid) {
        throw new Error(pwdStrength.errors.join(", "));
      }
      updateData.passwordHash = await hashPassword(input.password);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        role: { select: { id: true, code: true, name: true } },
        bpr: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    return toSafeUser(user);
  }

  /**
   * Soft deletes a user by setting deletedAt.
   */
  static async softDelete(id: string): Promise<SafeUser> {
    const user = await db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        role: { select: { id: true, code: true, name: true } },
        bpr: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    return toSafeUser(user);
  }

  /**
   * Updates last login timestamp.
   */
  static async updateLastLogin(id: string): Promise<void> {
    await db.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Lists users with filtering options.
   */
  static async list(filter: UserListFilter = {}): Promise<SafeUser[]> {
    const where: Prisma.UserWhereInput = {};

    if (!filter.includeDeleted) {
      where.deletedAt = null;
    }
    if (filter.roleId) {
      where.roleId = filter.roleId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.bprId) {
      where.bprId = filter.bprId;
    }
    if (filter.branchId) {
      where.branchId = filter.branchId;
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        role: { select: { id: true, code: true, name: true } },
        bpr: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    return users.map(toSafeUser);
  }
}
