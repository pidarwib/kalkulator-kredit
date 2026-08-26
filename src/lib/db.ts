import { PrismaClient } from "@prisma/client";

// Global declaration for singleton PrismaClient in Next.js development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export const prisma = db;

/**
 * Utility function to test database connectivity.
 * Executes a simple `SELECT 1` query.
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  latencyMs?: number;
}> {
  const startTime = Date.now();
  try {
    await db.$queryRaw`SELECT 1 as ping`;
    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      message: "Database connection successful",
      latencyMs,
    };
  } catch (error: any) {
    return {
      connected: false,
      message: error?.message || "Failed to connect to database",
    };
  }
}
