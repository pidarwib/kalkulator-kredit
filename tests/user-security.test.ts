import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validateUserStatus,
} from "@/lib/auth";
import { UserRepository, toSafeUser } from "@/lib/repositories";
import { db } from "@/lib/db";

describe("TASK-010: User & Password Security", { timeout: 60000 }, () => {
  const testUsername = `testuser_${Date.now()}`;
  const testEmail = `${testUsername}@example.com`;
  const strongPassword = "SecureP@ssw0rd123";
  let createdUserId: string;
  let superAdminRoleId: string;

  beforeAll(async () => {
    const role = await db.role.findUnique({
      where: { code: "SUPER_ADMIN" },
    });
    if (!role) {
      throw new Error("SUPER_ADMIN role must exist in database");
    }
    superAdminRoleId = role.id;
  });

  afterAll(async () => {
    // Clean up test user
    if (createdUserId) {
      await db.user.deleteMany({
        where: { id: createdUserId },
      });
    }
  });

  describe("Secure Password Hashing & Verification", () => {
    it("should produce a valid salted password hash", async () => {
      const hash = await hashPassword(strongPassword);

      expect(hash).toBeDefined();
      expect(hash.startsWith("$2")).toBe(true);
    });

    it("should generate distinct hashes for identical passwords due to salting", async () => {
      const hash1 = await hashPassword(strongPassword);
      const hash2 = await hashPassword(strongPassword);

      expect(hash1).not.toBe(hash2);
    });

    it("should correctly verify password against hash", async () => {
      const hash = await hashPassword(strongPassword);

      const isValid = await verifyPassword(strongPassword, hash);
      const isInvalid = await verifyPassword("WrongPassword!", hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it("should reject empty or invalid inputs", async () => {
      await expect(hashPassword("")).rejects.toThrow("Password cannot be empty");
      expect(await verifyPassword("", "somehash")).toBe(false);
      expect(await verifyPassword("password", "")).toBe(false);
    });
  });

  describe("Password Policy Validation", () => {
    it("should accept compliant strong passwords", () => {
      const result = validatePasswordStrength("StrongPass1");
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject passwords that are too short", () => {
      const result = validatePasswordStrength("Short1");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("8 karakter"))).toBe(true);
    });

    it("should reject passwords with letters only", () => {
      const result = validatePasswordStrength("OnlyLettersPass");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("angka"))).toBe(true);
    });

    it("should reject passwords with numbers only", () => {
      const result = validatePasswordStrength("123456789");
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("huruf"))).toBe(true);
    });
  });

  describe("User Status Validation", () => {
    it("should allow ACTIVE users", () => {
      const result = validateUserStatus({ status: "ACTIVE", deletedAt: null });
      expect(result.isAllowed).toBe(true);
    });

    it("should reject INACTIVE users", () => {
      const result = validateUserStatus({ status: "INACTIVE", deletedAt: null });
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain("belum aktif");
    });

    it("should reject SUSPENDED users", () => {
      const result = validateUserStatus({ status: "SUSPENDED", deletedAt: null });
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain("ditangguhkan");
    });

    it("should reject soft-deleted users regardless of status", () => {
      const result = validateUserStatus({
        status: "ACTIVE",
        deletedAt: new Date(),
      });
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain("dihapus");
    });
  });

  describe("UserRepository & Plaintext Isolation", () => {
    it("should create user with hashed password and return SafeUser without passwordHash", async () => {
      const safeUser = await UserRepository.create({
        username: testUsername,
        email: testEmail,
        password: strongPassword,
        fullName: "Test Security User",
        roleId: superAdminRoleId,
      });

      createdUserId = safeUser.id;

      expect(safeUser.id).toBeDefined();
      expect(safeUser.username).toBe(testUsername);
      expect((safeUser as any).passwordHash).toBeUndefined();
    });

    it("should find user by username without passwordHash in public methods", async () => {
      const user = await UserRepository.findByUsername(testUsername);

      expect(user).toBeDefined();
      expect(user?.username).toBe(testUsername);
      expect((user as any).passwordHash).toBeUndefined();
    });

    it("should retrieve passwordHash exclusively through internal authentication method", async () => {
      const userWithSecret = await UserRepository.findByUsernameWithSecret(testUsername);

      expect(userWithSecret).toBeDefined();
      expect(userWithSecret?.passwordHash).toBeDefined();
      expect(userWithSecret?.passwordHash.startsWith("$2")).toBe(true);

      const isValid = await verifyPassword(strongPassword, userWithSecret!.passwordHash);
      expect(isValid).toBe(true);
    });

    it("should reject creating a user with weak password", async () => {
      await expect(
        UserRepository.create({
          username: `weak_${Date.now()}`,
          password: "123",
          fullName: "Weak Pass User",
          roleId: superAdminRoleId,
        })
      ).rejects.toThrow();
    });

    it("should soft delete user and exclude from normal lookups", async () => {
      const softDeleted = await UserRepository.softDelete(createdUserId);
      expect(softDeleted.deletedAt).toBeDefined();

      const lookup = await UserRepository.findByUsername(testUsername);
      expect(lookup).toBeNull();

      const lookupWithDeleted = await UserRepository.findByUsername(testUsername, true);
      expect(lookupWithDeleted).toBeDefined();
    });
  });
});
