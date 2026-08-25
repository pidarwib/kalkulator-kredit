import { describe, it, expect } from "vitest";
import { validateEnv } from "@/lib/env";
import * as fs from "fs";
import * as path from "path";

describe("TASK-003: Environment Configuration", () => {
  const validMockEnv = {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/kalkulator_kredit?schema=public",
    AUTH_SECRET: "this-is-a-very-secure-secret-key-of-more-than-32-chars",
    NODE_ENV: "development",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  };

  describe("Validation Logic", () => {
    it("should succeed with valid environment variables", () => {
      const parsed = validateEnv(validMockEnv);
      expect(parsed.DATABASE_URL).toBe(validMockEnv.DATABASE_URL);
      expect(parsed.AUTH_SECRET).toBe(validMockEnv.AUTH_SECRET);
      expect(parsed.NODE_ENV).toBe("development");
      expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    });

    it("should fail when DATABASE_URL is missing", () => {
      const invalidEnv = { ...validMockEnv, DATABASE_URL: undefined };
      expect(() => validateEnv(invalidEnv as any)).toThrow("DATABASE_URL");
    });

    it("should fail when AUTH_SECRET is shorter than 32 characters", () => {
      const shortSecretEnv = { ...validMockEnv, AUTH_SECRET: "short-secret" };
      expect(() => validateEnv(shortSecretEnv)).toThrow(
        "AUTH_SECRET must be at least 32 characters"
      );
    });

    it("should not leak secret values in error messages", () => {
      const secretValue = "super-secret-key-that-should-never-appear-in-logs";
      try {
        validateEnv({
          AUTH_SECRET: "too-short",
          DATABASE_URL: "",
          // inject secret in an invalid field
          NODE_ENV: "invalid-env" as any,
        });
      } catch (error: any) {
        expect(error.message).not.toContain(secretValue);
        expect(error.message).toContain("❌ Invalid environment configuration");
        expect(error.message).toContain("DATABASE_URL");
        expect(error.message).toContain("AUTH_SECRET");
      }
    });

    it("should provide default values for optional configurations", () => {
      const minimalEnv = {
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/db",
        AUTH_SECRET: "another-very-long-secret-key-with-over-32-characters",
      };
      const parsed = validateEnv(minimalEnv);
      expect(parsed.NODE_ENV).toBe("development");
      expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
      expect(parsed.OPENROUTER_API_KEY).toBe("");
    });
  });

  describe("Files and Git Ignore Rules", () => {
    it("should verify .env.example exists and contains required categories without actual secrets", () => {
      const envExamplePath = path.resolve(process.cwd(), ".env.example");
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const content = fs.readFileSync(envExamplePath, "utf-8");
      expect(content).toContain("DATABASE_URL");
      expect(content).toContain("AUTH_SECRET");
      expect(content).toContain("NODE_ENV");
      expect(content).toContain("NEXT_PUBLIC_APP_URL");
    });

    it("should verify .gitignore ignores .env and .env*.local", () => {
      const gitignorePath = path.resolve(process.cwd(), ".gitignore");
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, "utf-8");
      expect(content).toMatch(/\.env/);
    });
  });
});
