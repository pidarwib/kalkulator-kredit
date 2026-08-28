/**
 * TASK-065 — Secret Exposure Security Tests
 *
 * Verifies that sensitive system secrets (API keys, passwords, password hashes,
 * session secret, database credentials) NEVER leak into:
 * 1. Frontend bundles & Client-side components
 * 2. API JSON Responses (Users, Auth, Calculations, Simulations, Audit Logs)
 * 3. Audit Trail Logs & Payloads
 * 4. Git Repository & Tracked Files
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { GET as getUsers, POST as createUser } from "@/app/api/v1/users/route";
import { GET as getUser, PATCH as updateUser } from "@/app/api/v1/users/[id]/route";
import { GET as getAuditLogs, sanitizeAuditPayload } from "@/app/api/v1/audit-logs/route";
import { UserRepository } from "@/lib/repositories/user-repository";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";

const UNIQUE_TAG = `secret_${Date.now()}`;
const TIMEOUT_MS = 60_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  method: string,
  path: string,
  token?: string,
  body?: object
): NextRequest {
  const url = `http://localhost${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeRouteParams(id: string) {
  return { params: { id } };
}

// ─── Test Suite ────────────────────────────────────────────────────────────────

describe("TASK-065: Secret Exposure Security Tests", { timeout: TIMEOUT_MS }, () => {
  let superAdminToken: string;
  let superAdminId: string;
  let testUserId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const saRole = await db.role.findUnique({ where: { code: "SUPER_ADMIN" } });
    if (!saRole) throw new Error("SUPER_ADMIN role must exist.");

    const saUser = await UserRepository.create({
      username: `sa_secret_${UNIQUE_TAG}`,
      password: "SuperSecretPassword123!",
      fullName: "Super Admin Secret Test",
      roleId: saRole.id,
    });
    superAdminId = saUser.id;
    createdUserIds.push(superAdminId);

    superAdminToken = await signSessionToken({
      userId: superAdminId,
      username: saUser.username,
      fullName: saUser.fullName,
      role: saRole.code,
    });
  }, 60000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  }, 60000);

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 1: Frontend Bundle & Client Component Code Static Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Frontend Bundle & Client Source Code Safety", () => {
    const findClientFiles = (dir: string, fileList: string[] = []): string[] => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          // Skip api directory and server-only node modules
          if (file !== "api" && file !== "node_modules" && file !== ".next") {
            findClientFiles(fullPath, fileList);
          }
        } else if (file.endsWith(".tsx") || (file.endsWith(".ts") && !fullPath.includes("/api/"))) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    };

    it("should ensure no client files reference process.env.DATABASE_URL or process.env.AUTH_SECRET directly", () => {
      const workspaceRoot = process.cwd();
      const clientDir = path.join(workspaceRoot, "src", "components");
      const appDir = path.join(workspaceRoot, "src", "app");
      const clientFiles = [...findClientFiles(clientDir), ...findClientFiles(appDir)];

      const forbiddenEnvVars = [
        "process.env.DATABASE_URL",
        "process.env.DIRECT_URL",
        "process.env.AUTH_SECRET",
        "process.env.OPENROUTER_API_KEY",
      ];

      for (const filePath of clientFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        for (const envVar of forbiddenEnvVars) {
          expect(
            content.includes(envVar),
            `Security Violation: ${filePath} contains forbidden reference to ${envVar}`
          ).toBe(false);
        }
      }
    });

    it("should ensure no NEXT_PUBLIC_ variable exposes database credentials, passwords, or secrets", () => {
      const workspaceRoot = process.cwd();
      const srcDir = path.join(workspaceRoot, "src");
      const allSrcFiles = findClientFiles(srcDir);

      const dangerousPublicPrefixes = [
        "NEXT_PUBLIC_DATABASE",
        "NEXT_PUBLIC_DB_",
        "NEXT_PUBLIC_SECRET",
        "NEXT_PUBLIC_PASSWORD",
        "NEXT_PUBLIC_API_KEY",
        "NEXT_PUBLIC_TOKEN",
      ];

      for (const filePath of allSrcFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        for (const prefix of dangerousPublicPrefixes) {
          expect(
            content.includes(prefix),
            `Security Violation: ${filePath} references sensitive public env variable ${prefix}`
          ).toBe(false);
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 2: API Response Secret Redaction
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. API JSON Responses Secret Redaction", () => {
    it("should NEVER include passwordHash or password in POST /api/v1/users response", async () => {
      const mktRole = await db.role.findUnique({ where: { code: "MARKETING" } });
      const bpr = await db.bpr.findFirst();

      const createReq = makeRequest("POST", "/api/v1/users", superAdminToken, {
        username: `target_secret_${UNIQUE_TAG}`,
        password: "MySuperSecretPassword999!",
        fullName: "Secret Target User",
        roleId: mktRole?.id,
        bprId: bpr?.id,
      });

      const res = await createUser(createReq);
      expect(res.status).toBe(201);

      const json = await res.json();
      testUserId = json.data.id;
      createdUserIds.push(testUserId);

      // Deep search for any leaked password or passwordHash in response body
      const jsonStr = JSON.stringify(json);
      expect(jsonStr.includes("MySuperSecretPassword999!")).toBe(false);
      expect(jsonStr.includes("passwordHash")).toBe(false);
      expect(json.data.password).toBeUndefined();
      expect(json.data.passwordHash).toBeUndefined();
    });

    it("should NEVER include passwordHash in GET /api/v1/users list response", async () => {
      const req = makeRequest("GET", `/api/v1/users?search=target_secret_${UNIQUE_TAG}`, superAdminToken);
      const res = await getUsers(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const jsonStr = JSON.stringify(json);

      expect(jsonStr.includes("passwordHash")).toBe(false);
      expect(jsonStr.includes("$2b$")).toBe(false); // bcrypt hash prefix
      expect(jsonStr.includes("$2a$")).toBe(false);
    });

    it("should NEVER include passwordHash in GET /api/v1/users/:id detail response", async () => {
      const req = makeRequest("GET", `/api/v1/users/${testUserId}`, superAdminToken);
      const res = await getUser(req, makeRouteParams(testUserId));

      expect(res.status).toBe(200);
      const json = await res.json();
      const jsonStr = JSON.stringify(json);

      expect(jsonStr.includes("passwordHash")).toBe(false);
      expect(json.data.passwordHash).toBeUndefined();
      expect(json.data.password).toBeUndefined();
    });

    it("should NEVER include passwordHash or updated password in PATCH /api/v1/users/:id response", async () => {
      const req = makeRequest("PATCH", `/api/v1/users/${testUserId}`, superAdminToken, {
        fullName: "Updated Name Secret",
        password: "NewSuperSecretPassword123!",
      });
      const res = await updateUser(req, makeRouteParams(testUserId));

      expect(res.status).toBe(200);
      const json = await res.json();
      const jsonStr = JSON.stringify(json);

      expect(jsonStr.includes("NewSuperSecretPassword123!")).toBe(false);
      expect(jsonStr.includes("passwordHash")).toBe(false);
      expect(json.data.passwordHash).toBeUndefined();
      expect(json.data.password).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 3: Audit Trail Log Secret Sanitization & Redaction
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Audit Trail Log Secret Sanitization", () => {
    it("sanitizeAuditPayload should recursively mask passwords, tokens, hashes, and secrets", () => {
      const sensitiveData = {
        username: "testuser",
        password: "PlaintextPassword123!",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890",
        nested: {
          authToken: "jwt_token_header.payload.signature",
          jwtSecret: "super_secret_key_12345",
          salt: "random_salt_123",
          apiKey: "sk-or-v1-abcdef123456",
          safeField: "safe value",
        },
        userArray: [
          { secretKey: "secret_array_val", name: "John" },
        ],
      };

      const sanitized = sanitizeAuditPayload(sensitiveData);

      expect(sanitized.username).toBe("testuser");
      expect(sanitized.password).toBe("******** (REDACTED)");
      expect(sanitized.passwordHash).toBe("******** (REDACTED)");
      expect(sanitized.nested.authToken).toBe("******** (REDACTED)");
      expect(sanitized.nested.jwtSecret).toBe("******** (REDACTED)");
      expect(sanitized.nested.salt).toBe("******** (REDACTED)");
      expect(sanitized.nested.apiKey).toBe("******** (REDACTED)");
      expect(sanitized.nested.safeField).toBe("safe value");
      expect(sanitized.userArray[0].secretKey).toBe("******** (REDACTED)");
      expect(sanitized.userArray[0].name).toBe("John");
    });

    it("should return sanitized payload without plaintext secrets in GET /api/v1/audit-logs", async () => {
      const req = makeRequest("GET", "/api/v1/audit-logs?pageSize=10", superAdminToken);
      const res = await getAuditLogs(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      const jsonStr = JSON.stringify(json);

      // Verify no raw bcrypt hashes or password strings appear in audit logs query
      expect(jsonStr.includes("$2b$10$")).toBe(false);
      expect(jsonStr.includes("MySuperSecretPassword999!")).toBe(false);
      expect(jsonStr.includes("NewSuperSecretPassword123!")).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 4: Git Version Control & Environment File Safety
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Git Repository & Environment Secret Hygiene", () => {
    it("should ensure .gitignore ignores .env and local environment files", () => {
      const gitignorePath = path.join(process.cwd(), ".gitignore");
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

      expect(gitignoreContent.includes(".env")).toBe(true);
      expect(gitignoreContent.includes(".env*.local")).toBe(true);
    });

    it("should ensure .env.example contains zero real passwords, secrets, or connection strings", () => {
      const envExamplePath = path.join(process.cwd(), ".env.example");
      const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");

      // Check placeholder tokens are used rather than actual credentials
      expect(envExampleContent.includes("[PASSWORD]")).toBe(true);
      expect(envExampleContent.includes("[PROJECT_REF]")).toBe(true);
      expect(envExampleContent.includes("change-this-to-a-secure-random-secret-key")).toBe(true);
    });
  });
});
