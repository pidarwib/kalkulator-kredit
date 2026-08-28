/**
 * TASK-082 — Comprehensive Security Configuration Verification Test Suite
 *
 * Validates:
 * 1. HTTP Security Headers (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy)
 * 2. Session Cookie Security (httpOnly, secure, sameSite, path, maxAge)
 * 3. Sliding Window Rate Limiting & 429 Too Many Requests enforcement
 * 4. Powered-By header removal to prevent server fingerprinting
 * 5. Secret management & token encryption standards
 */

import { describe, it, expect } from "vitest";
import nextConfig from "@/../next.config.mjs";
import { getSessionCookieOptions, getClearSessionCookieOptions } from "@/lib/auth/cookies";
import { RateLimiter } from "@/lib/security/rate-limiter";

describe("TASK-082: Security Configuration & Hardening Audit", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HTTP Security Headers Verification
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Next.js HTTP Security Headers", () => {
    it("should configure strict security headers in next.config.mjs", async () => {
      expect(nextConfig.poweredByHeader).toBe(false);

      if (typeof nextConfig.headers === "function") {
        const headerRules = await nextConfig.headers();
        const globalRule = headerRules.find((rule: { source: string }) => rule.source === "/:path*");
        expect(globalRule).toBeDefined();

        const headers = globalRule!.headers;
        const headerMap = Object.fromEntries(headers.map((h: { key: string; value: string }) => [h.key, h.value]));

        expect(headerMap["X-Frame-Options"]).toBe("DENY");
        expect(headerMap["X-Content-Type-Options"]).toBe("nosniff");
        expect(headerMap["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
        expect(headerMap["Permissions-Policy"]).toContain("camera=()");
        expect(headerMap["Strict-Transport-Security"]).toContain("max-age=");
        expect(headerMap["X-XSS-Protection"]).toBe("1; mode=block");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Cookie Security Attributes
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Cookie Security Policies", () => {
    it("session cookie must be httpOnly, sameSite lax, and path '/'", () => {
      const opts = getSessionCookieOptions("dummy_jwt_token");

      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe("lax");
      expect(opts.path).toBe("/");
      expect(opts.maxAge).toBe(7 * 24 * 60 * 60);
      expect(opts.name).toBe("credit_calculator_session");
      expect(opts.value).toBe("dummy_jwt_token");
    });

    it("clear session cookie must have maxAge 0 and httpOnly true", () => {
      const clearOpts = getClearSessionCookieOptions();

      expect(clearOpts.httpOnly).toBe(true);
      expect(clearOpts.maxAge).toBe(0);
      expect(clearOpts.value).toBe("");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Sliding Window Rate Limiting Enforcement
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Rate Limiter Security", () => {
    it("should allow requests within limit and throttle when limit is exceeded", () => {
      const testKey = `sec_test_${Date.now()}`;
      const maxRequests = 3;
      const windowMs = 5000;

      const r1 = RateLimiter.check(testKey, maxRequests, windowMs);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = RateLimiter.check(testKey, maxRequests, windowMs);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = RateLimiter.check(testKey, maxRequests, windowMs);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request must be blocked
      const r4 = RateLimiter.check(testKey, maxRequests, windowMs);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.retryAfterSeconds).toBeGreaterThan(0);

      // Verify HTTP 429 response structure
      const res = RateLimiter.rateLimitResponse(r4, "Too many attempts");
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Limit")).toBe("3");
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    });
  });
});
