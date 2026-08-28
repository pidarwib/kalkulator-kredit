/**
 * TASK-079 — Error Monitoring & Secret Exposure Prevention Test Suite
 *
 * Validates:
 * 1. Deep Redaction of sensitive fields (password, passwordHash, token, authorization, cookie, secrets)
 * 2. Structured JSON log formatting across log levels (INFO, WARN, ERROR, FATAL)
 * 3. Prevention of secret leakage during error reporting and monitoring
 * 4. Error trace retention without exposing system credentials or connection strings
 */

import { describe, it, expect } from "vitest";
import { Logger, redactSensitiveData } from "@/lib/observability";

describe("TASK-079: Error Monitoring & Secret Protection Audit", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Sensitive Data Deep Redaction Engine
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Sensitive Payload Redaction", () => {
    it("should redact plain passwords, password hashes, and secrets in nested objects", () => {
      const payload = {
        userId: "usr_123",
        username: "admin_user",
        password: "SuperSecretPassword!",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhash",
        nested: {
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
          refreshToken: "secret_refresh_token_value",
          normalField: "visible_value",
        },
      };

      const sanitized = redactSensitiveData(payload);

      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.passwordHash).toBe("[REDACTED]");
      expect(sanitized.nested.token).toBe("[REDACTED]");
      expect(sanitized.nested.refreshToken).toBe("[REDACTED]");
      expect(sanitized.nested.normalField).toBe("visible_value");
      expect(sanitized.username).toBe("admin_user");
    });

    it("should redact Authorization headers with Bearer tokens embedded in string messages", () => {
      const text = "Request failed with header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdef";
      const sanitized = redactSensitiveData(text);

      expect(sanitized).toBe("Request failed with header: Bearer [REDACTED]");
    });

    it("should redact database URLs, API keys, and cookie headers", () => {
      const config = {
        database_url: "postgresql://postgres:secretpassword@localhost:5432/db",
        apiKey: "api_sec_99998888",
        cookie: "auth_token=eyJhbGciOiJIUzI1Ni...; Path=/",
        status: "ACTIVE",
      };

      const sanitized = redactSensitiveData(config);

      expect(sanitized.database_url).toBe("[REDACTED]");
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.cookie).toBe("[REDACTED]");
      expect(sanitized.status).toBe("ACTIVE");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Structured Logger & Error Monitoring Formatting
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Structured Error Logging", () => {
    it("should format ERROR entries with timestamp, sanitized context, and error details", () => {
      const err = new Error("Database connection timed out");
      (err as unknown as { code: string }).code = "DB_TIMEOUT";

      const logEntry = Logger.error("Failed to process transaction", {
        userId: "user_789",
        password: "ShouldBeRedactedPassword",
        endpoint: "/api/v1/simulations",
        durationMs: 450,
      }, err);

      expect(logEntry.level).toBe("ERROR");
      expect(logEntry.message).toBe("Failed to process transaction");
      expect(logEntry.context?.userId).toBe("user_789");
      expect(logEntry.context?.password).toBe("[REDACTED]");
      expect(logEntry.context?.endpoint).toBe("/api/v1/simulations");
      expect(logEntry.error?.name).toBe("Error");
      expect(logEntry.error?.message).toBe("Database connection timed out");
      expect(logEntry.error?.code).toBe("DB_TIMEOUT");
    });

    it("should format INFO and WARN logs with clean structured output", () => {
      const infoLog = Logger.info("User login succeeded", {
        userId: "usr_100",
        role: "MARKETING",
      });

      expect(infoLog.level).toBe("INFO");
      expect(infoLog.context?.role).toBe("MARKETING");

      const warnLog = Logger.warn("Rate limit threshold approached", {
        ip: "192.168.1.1",
        requestCount: 14,
      });

      expect(warnLog.level).toBe("WARN");
      expect(warnLog.context?.requestCount).toBe(14);
    });
  });
});
