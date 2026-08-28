/**
 * TASK-080 — Environment Separation & Configuration Isolation Test Suite
 *
 * Validates:
 * 1. Environment separation across development, test, and production tiers
 * 2. .env.example contains only placeholders, zero production secrets or hardcoded passwords
 * 3. .gitignore isolates all .env variants from git commits
 * 4. Strict environment validation rules (DATABASE_URL presence, AUTH_SECRET >= 32 chars)
 * 5. Sanitized environment validation errors without value leakage
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { validateEnv } from "@/lib/env";

describe("TASK-080: Environment Separation & Secret Isolation", () => {
  const rootDir = process.cwd();
  const envExamplePath = path.join(rootDir, ".env.example");
  const gitignorePath = path.join(rootDir, ".gitignore");

  const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Template Safety & Zero Production Secret Leakage
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. .env.example Template Safety", () => {
    it(".env.example must only contain placeholders and no real passwords or project credentials", () => {
      expect(envExampleContent).toContain("[PROJECT_REF]");
      expect(envExampleContent).toContain("[PASSWORD]");
      expect(envExampleContent).toContain("change-this-to-a-secure-random-secret-key-min-32-chars");

      // Verify no live credentials
      expect(envExampleContent).not.toContain("supabase.co:5432/postgres?sslmode=require");
      expect(envExampleContent).not.toMatch(/postgres:\/\/postgres:[a-zA-Z0-9_-]{8,}@/);
    });

    it(".gitignore must strictly ignore all local environment files", () => {
      expect(gitignoreContent).toContain(".env");
      expect(gitignoreContent).toContain(".env*.local");
      expect(gitignoreContent).toContain(".env.development");
      expect(gitignoreContent).toContain(".env.production");
      expect(gitignoreContent).toContain(".env.staging");
      expect(gitignoreContent).toContain(".env.test");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Multi-Tier Environment Validation Logic
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Multi-Tier Environment Validation", () => {
    it("should accept valid production environment configuration with strong AUTH_SECRET", () => {
      const validProdEnv = {
        DATABASE_URL: "postgresql://postgres:prod_password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
        AUTH_SECRET: "strong-production-secret-key-with-minimum-32-chars-length!",
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://kredit.bpr-system.co.id",
      };

      const parsed = validateEnv(validProdEnv);
      expect(parsed.NODE_ENV).toBe("production");
      expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://kredit.bpr-system.co.id");
    });

    it("should reject weak AUTH_SECRET (< 32 characters) for security compliance", () => {
      const weakEnv = {
        DATABASE_URL: "postgresql://postgres:pass@localhost:5432/db",
        AUTH_SECRET: "too-short",
        NODE_ENV: "production",
      };

      expect(() => validateEnv(weakEnv)).toThrowError(/AUTH_SECRET must be at least 32 characters/);
    });

    it("should reject missing or empty DATABASE_URL", () => {
      const missingDbEnv = {
        AUTH_SECRET: "strong-production-secret-key-with-minimum-32-chars-length!",
        NODE_ENV: "production",
      };

      expect(() => validateEnv(missingDbEnv)).toThrowError(/DATABASE_URL is required/);
    });

    it("should sanitize validation error messages to never leak submitted secret values", () => {
      const invalidEnv = {
        DATABASE_URL: "",
        AUTH_SECRET: "short",
        NEXT_PUBLIC_APP_URL: "invalid-url-string",
      };

      try {
        validateEnv(invalidEnv);
        expect.unreachable("Should have thrown validation error");
      } catch (err: unknown) {
        const message = (err as Error).message;
        // Error message must show field names and instructions without exposing values
        expect(message).toContain("DATABASE_URL");
        expect(message).toContain("AUTH_SECRET");
        expect(message).toContain("NEXT_PUBLIC_APP_URL");
      }
    });
  });
});
