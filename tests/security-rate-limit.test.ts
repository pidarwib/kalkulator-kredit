/**
 * TASK-066 — Rate Limit & Brute Force Protection Security Tests
 *
 * Verifies that the system protects sensitive endpoints against automated
 * brute-force attacks, credential stuffing, and volumetric denial-of-service:
 * 1. Login Endpoint (`POST /api/v1/auth/login`) rate limiting & HTTP 429 response
 * 2. Rate limit header compliance (Retry-After, X-RateLimit-*)
 * 3. Client IP isolation (traffic from IP-A does not throttle IP-B)
 * 4. Sliding-window algorithm and recovery mechanics
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginRoute } from "@/app/api/v1/auth/login/route";
import { RateLimiter, RateLimitResult } from "@/lib/security/rate-limiter";
import { db } from "@/lib/db";

const UNIQUE_TAG = `ratelimit_${Date.now()}`;
const TIMEOUT_MS = 30_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLoginRequest(ip: string, body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

// ─── Test Suite ────────────────────────────────────────────────────────────────

describe("TASK-066: Rate Limiting & Brute Force Protection Tests", { timeout: TIMEOUT_MS }, () => {
  beforeEach(() => {
    // Reset rate limiter store between tests to ensure clean test isolation
    RateLimiter.reset();
  });

  afterAll(() => {
    RateLimiter.reset();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Login Endpoint Brute Force Protection
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Login Endpoint Rate Limiting (POST /api/v1/auth/login)", () => {
    it("should allow requests under the threshold (15 req/min) and block subsequent with 429", async () => {
      const attackerIp = "192.168.1.100";
      const payload = { username: "non_existent_user", password: "wrong_password" };

      // Send 15 consecutive requests (allowed through, returning 401 for invalid credentials)
      for (let i = 0; i < 15; i++) {
        const req = makeLoginRequest(attackerIp, payload);
        const res = await loginRoute(req);
        // 401 is expected for invalid credentials, not 429
        expect(res.status).toBe(401);
      }

      // The 16th request must be RATE LIMITED (HTTP 429 Too Many Requests)
      const blockedReq = makeLoginRequest(attackerIp, payload);
      const blockedRes = await loginRoute(blockedReq);

      expect(blockedRes.status).toBe(429);
      const json = await blockedRes.json();
      expect(json.error?.code).toBe("TOO_MANY_REQUESTS");
      expect(json.error?.message).toContain("Terlalu banyak");

      // Verify standard RateLimit response headers
      expect(blockedRes.headers.get("Retry-After")).toBeDefined();
      expect(parseInt(blockedRes.headers.get("Retry-After") || "0", 10)).toBeGreaterThan(0);
      expect(blockedRes.headers.get("X-RateLimit-Limit")).toBe("15");
      expect(blockedRes.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(blockedRes.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    it("should maintain IP isolation (Attacker on IP-A being throttled does not impact Victim on IP-B)", async () => {
      const attackerIp = "10.0.0.1";
      const legitimateIp = "10.0.0.2";
      const payload = { username: "some_user", password: "some_password" };

      // Exhaust rate limit on attacker IP (15 requests)
      for (let i = 0; i < 15; i++) {
        const req = makeLoginRequest(attackerIp, payload);
        await loginRoute(req);
      }

      // Attacker is now blocked
      const attackerBlocked = await loginRoute(makeLoginRequest(attackerIp, payload));
      expect(attackerBlocked.status).toBe(429);

      // Legitimate user from different IP must NOT be blocked
      const legitReq = makeLoginRequest(legitimateIp, payload);
      const legitRes = await loginRoute(legitReq);
      expect(legitRes.status).toBe(401); // Evaluated normally (not 429)
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RateLimiter Service Unit Logic & Algorithms
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. RateLimiter Sliding Window Engine", () => {
    it("should accurately count remaining allowance in sliding window", () => {
      const key = "test:client:1";
      const limit = 5;
      const windowMs = 60_000;

      // 1st request
      const r1 = RateLimiter.check(key, limit, windowMs);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(4);

      // 2nd request
      const r2 = RateLimiter.check(key, limit, windowMs);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(3);

      // 3rd request
      const r3 = RateLimiter.check(key, limit, windowMs);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(2);

      // 4th request
      const r4 = RateLimiter.check(key, limit, windowMs);
      expect(r4.allowed).toBe(true);
      expect(r4.remaining).toBe(1);

      // 5th request (last permitted)
      const r5 = RateLimiter.check(key, limit, windowMs);
      expect(r5.allowed).toBe(true);
      expect(r5.remaining).toBe(0);

      // 6th request (blocked)
      const r6 = RateLimiter.check(key, limit, windowMs);
      expect(r6.allowed).toBe(false);
      expect(r6.remaining).toBe(0);
      expect(r6.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("should reset single key when requested", () => {
      const key1 = "test:reset:1";
      const key2 = "test:reset:2";

      // Fill both keys
      for (let i = 0; i < 3; i++) {
        RateLimiter.check(key1, 3, 60_000);
        RateLimiter.check(key2, 3, 60_000);
      }

      expect(RateLimiter.check(key1, 3, 60_000).allowed).toBe(false);
      expect(RateLimiter.check(key2, 3, 60_000).allowed).toBe(false);

      // Reset only key1
      RateLimiter.reset(key1);

      // key1 is now allowed again
      expect(RateLimiter.check(key1, 3, 60_000).allowed).toBe(true);
      // key2 remains blocked
      expect(RateLimiter.check(key2, 3, 60_000).allowed).toBe(false);
    });

    it("should extract client IP from multiple proxy headers correctly", () => {
      // 1. x-forwarded-for with multiple IPs (client, proxy1, proxy2)
      const reqWithChain = new NextRequest("http://localhost/api", {
        headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
      });
      expect(RateLimiter.getClientIp(reqWithChain)).toBe("203.0.113.195");

      // 2. x-real-ip fallback
      const reqWithRealIp = new NextRequest("http://localhost/api", {
        headers: { "x-real-ip": "198.51.100.42" },
      });
      expect(RateLimiter.getClientIp(reqWithRealIp)).toBe("198.51.100.42");

      // 3. Fallback when no headers present
      const reqNoHeaders = new NextRequest("http://localhost/api");
      expect(RateLimiter.getClientIp(reqNoHeaders)).toBe("127.0.0.1");
    });

    it("should format standard 429 response correctly", () => {
      const mockResult: RateLimitResult = {
        allowed: false,
        limit: 10,
        remaining: 0,
        resetTime: Date.now() + 45_000,
        retryAfterSeconds: 45,
      };

      const response = RateLimiter.rateLimitResponse(mockResult, "Custom rate limit message");
      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("45");
      expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });
  });
});
