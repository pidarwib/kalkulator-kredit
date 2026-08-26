import { describe, it, expect, vi } from "vitest";
import { checkDatabaseConnection, db, prisma } from "@/lib/db";

describe("TASK-005: Database Connection", () => {
  it("should export singleton db and prisma instances", () => {
    expect(db).toBeDefined();
    expect(prisma).toBeDefined();
    expect(db).toBe(prisma);
  });

  it("should successfully ping the database via checkDatabaseConnection", async () => {
    const result = await checkDatabaseConnection();
    expect(result.connected).toBe(true);
    expect(result.message).toContain("Database connection successful");
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should handle connection errors gracefully when database fails", async () => {
    // Mock $queryRaw to simulate database failure
    const originalQueryRaw = db.$queryRaw;
    try {
      db.$queryRaw = vi.fn().mockRejectedValue(new Error("Connection timeout"));
      const result = await checkDatabaseConnection();
      expect(result.connected).toBe(false);
      expect(result.message).toContain("Connection timeout");
    } finally {
      db.$queryRaw = originalQueryRaw;
    }
  });
});
