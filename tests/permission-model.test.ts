import { describe, it, expect } from "vitest";
import {
  PermissionService,
  CANONICAL_PERMISSIONS,
  PermissionCode,
} from "@/lib/rbac";
import { db } from "@/lib/db";

describe("TASK-013: RBAC Permission Model & Validation", () => {
  it("should have exactly 40 canonical permissions in specification", () => {
    expect(CANONICAL_PERMISSIONS.length).toBe(40);
  });

  it("should verify all 40 canonical permissions exist in database with correct modules", async () => {
    const dbPermissions = await db.permission.findMany();
    expect(dbPermissions.length).toBe(40);

    const dbCodes = new Set(dbPermissions.map((p) => p.code));
    for (const code of CANONICAL_PERMISSIONS) {
      expect(dbCodes.has(code)).toBe(true);
    }

    // Verify module assignments
    const userView = dbPermissions.find((p) => p.code === "USER_VIEW");
    expect(userView?.module).toBe("USER");

    const simCreate = dbPermissions.find((p) => p.code === "SIMULATION_CREATE");
    expect(simCreate?.module).toBe("SIMULATION");

    const creditCalc = dbPermissions.find((p) => p.code === "CREDIT_CALCULATE");
    expect(creditCalc?.module).toBe("CREDIT");
  });

  it("should verify 3 canonical roles and their exact permission counts from ROLE_PERMISSION.md", async () => {
    const roles = await PermissionService.listRoles();
    expect(roles.length).toBe(3);

    const superAdmin = roles.find((r) => r.code === "SUPER_ADMIN");
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.permissions.length).toBe(40);

    const admin = roles.find((r) => r.code === "ADMIN");
    expect(admin).toBeDefined();
    expect(admin?.permissions.length).toBe(31);

    const marketing = roles.find((r) => r.code === "MARKETING");
    expect(marketing).toBeDefined();
    expect(marketing?.permissions.length).toBe(15);
  });

  it("should verify marketing role only has permitted operations", async () => {
    const permissions = await PermissionService.getPermissionsForRole("MARKETING");

    // Marketing CAN calculate and simulate
    expect(permissions).toContain("CREDIT_CALCULATE");
    expect(permissions).toContain("SIMULATION_CREATE");
    expect(permissions).toContain("SIMULATION_VIEW");

    // Marketing CANNOT manage users, roles, master data, or credit parameters
    expect(permissions).not.toContain("USER_CREATE");
    expect(permissions).not.toContain("USER_DELETE");
    expect(permissions).not.toContain("ROLE_VIEW");
    expect(permissions).not.toContain("MASTER_CREATE");
    expect(permissions).not.toContain("CREDIT_PARAMETER_CREATE");
    expect(permissions).not.toContain("AUDIT_VIEW");
  });

  describe("Permission Evaluation Logic (PermissionService)", () => {
    const marketingPerms = [
      "CREDIT_CALCULATE",
      "SIMULATION_CREATE",
      "SIMULATION_VIEW",
    ];

    it("should evaluate hasPermission accurately", () => {
      expect(
        PermissionService.hasPermission(marketingPerms, "CREDIT_CALCULATE")
      ).toBe(true);
      expect(
        PermissionService.hasPermission(marketingPerms, "USER_CREATE")
      ).toBe(false);

      // Super admin always has permission
      expect(
        PermissionService.hasPermission([], "USER_CREATE", "SUPER_ADMIN")
      ).toBe(true);
    });

    it("should evaluate hasAnyPermission accurately", () => {
      expect(
        PermissionService.hasAnyPermission(marketingPerms, [
          "USER_CREATE",
          "CREDIT_CALCULATE",
        ])
      ).toBe(true);

      expect(
        PermissionService.hasAnyPermission(marketingPerms, [
          "USER_CREATE",
          "USER_DELETE",
        ])
      ).toBe(false);
    });

    it("should evaluate hasAllPermissions accurately", () => {
      expect(
        PermissionService.hasAllPermissions(marketingPerms, [
          "CREDIT_CALCULATE",
          "SIMULATION_CREATE",
        ])
      ).toBe(true);

      expect(
        PermissionService.hasAllPermissions(marketingPerms, [
          "CREDIT_CALCULATE",
          "USER_CREATE",
        ])
      ).toBe(false);
    });

    it("should validate canonical vs non-canonical permissions", () => {
      expect(PermissionService.isCanonicalPermission("CREDIT_CALCULATE")).toBe(
        true
      );
      expect(
        PermissionService.isCanonicalPermission("UNKNOWN_CUSTOM_PERMISSION")
      ).toBe(false);
    });

    it("should list permissions filtered by module", async () => {
      const authPerms = await PermissionService.listPermissions("AUTH");
      expect(authPerms.length).toBe(6);
      expect(authPerms.every((p) => p.module === "AUTH")).toBe(true);

      const simPerms = await PermissionService.listPermissions("SIMULATION");
      expect(simPerms.length).toBe(5);
      expect(simPerms.every((p) => p.module === "SIMULATION")).toBe(true);
    });
  });
});
