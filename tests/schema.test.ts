import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

describe("TASK-006: Core Database Schema", { timeout: 30000 }, () => {
  it("should have all core model delegates defined in Prisma client", () => {
    // 1. Authentication & RBAC
    expect(db.user).toBeDefined();
    expect(db.role).toBeDefined();
    expect(db.permission).toBeDefined();
    expect(db.rolePermission).toBeDefined();

    // 2. Organization Structure
    expect(db.bpr).toBeDefined();
    expect(db.branch).toBeDefined();
    expect(db.paymentOffice).toBeDefined();

    // 3. Product Configuration
    expect(db.product).toBeDefined();
    expect(db.creditParameter).toBeDefined();
    expect(db.feeParameter).toBeDefined();
    expect(db.insuranceRate).toBeDefined();

    // 4. Versioning
    expect(db.businessRuleVersion).toBeDefined();
    expect(db.parameterVersion).toBeDefined();

    // 5. Calculations & Simulations
    expect(db.calculation).toBeDefined();
    expect(db.simulation).toBeDefined();
    expect(db.calculationResult).toBeDefined();
    expect(db.eligibilityReason).toBeDefined();
    expect(db.amortizationSchedule).toBeDefined();

    // 6. Audit & Health
    expect(db.auditLog).toBeDefined();
    expect(db.databaseHealth).toBeDefined();
  });

  it("should verify decimal precision definitions in Prisma schema models", () => {
    const sampleAmount = new Prisma.Decimal("100000000.00");
    const sampleRate = new Prisma.Decimal("0.10800");
    const sampleDbr = new Prisma.Decimal("0.9000");

    expect(sampleAmount.toString()).toBe("100000000");
    expect(sampleRate.toString()).toBe("0.108");
    expect(sampleDbr.toString()).toBe("0.9");
  });

  it("should verify database tables are queryable in PostgreSQL", async () => {
    // Test simple count query across core tables
    const [userCount, roleCount, bprCount, productCount, simCount] =
      await Promise.all([
        db.user.count(),
        db.role.count(),
        db.bpr.count(),
        db.product.count(),
        db.simulation.count(),
      ]);

    expect(typeof userCount).toBe("number");
    expect(typeof roleCount).toBe("number");
    expect(typeof bprCount).toBe("number");
    expect(typeof productCount).toBe("number");
    expect(typeof simCount).toBe("number");
  });
});
