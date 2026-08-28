import { NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in ms
  retryAfterSeconds: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

export class RateLimiter {
  private static store = new Map<string, RateLimitEntry>();

  /**
   * Evaluates if a request key (e.g. IP + endpoint) has exceeded the rate limit.
   * Uses a sliding-window algorithm based on request timestamps.
   */
  static check(
    key: string,
    maxRequests: number,
    windowMs: number
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Filter out timestamps outside the current sliding window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    const count = entry.timestamps.length;
    const allowed = count < maxRequests;

    if (allowed) {
      entry.timestamps.push(now);
    }

    const remaining = Math.max(0, maxRequests - entry.timestamps.length);
    const oldestTimestamp = entry.timestamps[0] || now;
    const resetTime = oldestTimestamp + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

    return {
      allowed,
      limit: maxRequests,
      remaining,
      resetTime,
      retryAfterSeconds,
    };
  }

  /**
   * Helper to extract client IP address from NextRequest headers.
   */
  static getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
    return "127.0.0.1";
  }

  /**
   * Generates a standard HTTP 429 Too Many Requests response with RateLimit headers.
   */
  static rateLimitResponse(
    result: RateLimitResult,
    message = "Terlalu banyak percobaan. Silakan coba lagi setelah beberapa saat."
  ): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: "TOO_MANY_REQUESTS",
          message,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": result.retryAfterSeconds.toString(),
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
        },
      }
    );
  }

  /**
   * Clears the in-memory store (primarily for unit tests).
   */
  static reset(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}
