import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar, getNavigationForUser } from "@/components/layout/sidebar";
import { AuthProvider } from "@/lib/auth/auth-provider";

// Mock Next.js pathname
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("TASK-043: Permission-aware Navigation & Sidebar Tests", () => {
  describe("getNavigationForUser helper function", () => {
    it("MARKETING: should only include Dashboard, Calculator, and Simulations", () => {
      const marketingPermissions = [
        "AUTH_LOGIN",
        "AUTH_LOGOUT",
        "CREDIT_CALCULATE",
        "SIMULATION_VIEW",
        "SIMULATION_CREATE",
        "SIMULATION_DELETE",
      ];

      const nav = getNavigationForUser(marketingPermissions, "MARKETING");

      // Group 1 should only have Dashboard, Kalkulator, and Daftar Simulasi
      expect(nav.length).toBe(1);
      const group1Titles = nav[0].items.map((i) => i.title);
      expect(group1Titles).toEqual(["Dashboard", "Kalkulator Kredit", "Daftar Simulasi"]);

      // Master Data and Sistem & Keamanan should be dropped completely
      expect(nav.some((g) => g.label === "Master Data")).toBe(false);
      expect(nav.some((g) => g.label === "Sistem & Keamanan")).toBe(false);
    });

    it("ADMIN: should include all operational and management items", () => {
      const adminPermissions = [
        "AUTH_LOGIN",
        "CREDIT_CALCULATE",
        "SIMULATION_VIEW",
        "PRODUCT_VIEW",
        "PARAMETER_VIEW",
        "INSURANCE_VIEW",
        "FEE_VIEW",
        "BPR_VIEW",
        "USER_VIEW",
        "AUDIT_VIEW",
      ];

      const nav = getNavigationForUser(adminPermissions, "ADMIN");

      expect(nav.length).toBe(3);
      expect(nav[0].items.map((i) => i.title)).toContain("Kalkulator Kredit");
      expect(nav[1].label).toBe("Master Data");
      expect(nav[1].items.map((i) => i.title)).toContain("Produk Kredit");
      expect(nav[1].items.map((i) => i.title)).toContain("Parameter Kredit");
      expect(nav[1].items.map((i) => i.title)).toContain("Tarif Asuransi");
      expect(nav[1].items.map((i) => i.title)).toContain("Parameter Biaya");
      expect(nav[1].items.map((i) => i.title)).toContain("Organisasi & Kantor");
      expect(nav[2].label).toBe("Sistem & Keamanan");
      expect(nav[2].items.map((i) => i.title)).toContain("Manajemen User");
      expect(nav[2].items.map((i) => i.title)).toContain("Audit Trail");
    });

    it("SUPER_ADMIN: should include all items unconditionally", () => {
      const nav = getNavigationForUser([], "SUPER_ADMIN");

      expect(nav.length).toBe(3);
      expect(nav.some((g) => g.label === "Master Data")).toBe(true);
      expect(nav.some((g) => g.label === "Sistem & Keamanan")).toBe(true);
    });
  });

  describe("Sidebar Component Render with Auth Context", () => {
    it("should render only allowed menu items for Marketing user", () => {
      const marketingUser = {
        id: "mkt-1",
        username: "marketing01",
        fullName: "Budi Marketing",
        role: "MARKETING",
        permissions: [
          "AUTH_LOGIN",
          "CREDIT_CALCULATE",
          "SIMULATION_VIEW",
          "SIMULATION_CREATE",
        ],
        scope: "OWN",
      };

      render(
        <AuthProvider initialUser={marketingUser}>
          <Sidebar isOpen={true} />
        </AuthProvider>
      );

      // Should show allowed items
      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Kalkulator Kredit")).toBeDefined();
      expect(screen.getByText("Daftar Simulasi")).toBeDefined();
      expect(screen.getByText("Budi Marketing")).toBeDefined();

      // Should NOT show master data or admin items
      expect(screen.queryByText("Master Data")).toBeNull();
      expect(screen.queryByText("Produk Kredit")).toBeNull();
      expect(screen.queryByText("Parameter Kredit")).toBeNull();
      expect(screen.queryByText("Manajemen User")).toBeNull();
      expect(screen.queryByText("Audit Trail")).toBeNull();
    });

    it("should render full management menus for Super Admin user", () => {
      const superAdminUser = {
        id: "sa-1",
        username: "superadmin",
        fullName: "Super Administrator",
        role: "SUPER_ADMIN",
        permissions: ["ALL"],
        scope: "ALL",
      };

      render(
        <AuthProvider initialUser={superAdminUser}>
          <Sidebar isOpen={true} />
        </AuthProvider>
      );

      // Should show all items
      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Kalkulator Kredit")).toBeDefined();
      expect(screen.getByText("Daftar Simulasi")).toBeDefined();
      expect(screen.getByText("Master Data")).toBeDefined();
      expect(screen.getByText("Produk Kredit")).toBeDefined();
      expect(screen.getByText("Parameter Kredit")).toBeDefined();
      expect(screen.getByText("Tarif Asuransi")).toBeDefined();
      expect(screen.getByText("Parameter Biaya")).toBeDefined();
      expect(screen.getByText("Organisasi & Kantor")).toBeDefined();
      expect(screen.getByText("Manajemen User")).toBeDefined();
      expect(screen.getByText("Audit Trail")).toBeDefined();
    });
  });
});
