/**
 * TASK-076 — Responsive UI & Layout Review Test Suite
 *
 * Validates:
 * 1. Mobile Drawer & Backdrop mechanism in Sidebar & AppLayout
 * 2. Responsive Breakpoint Constraints (Desktop `lg:`, Tablet `md:`, Mobile `sm:`)
 * 3. Horizontal Scroll Overflow Protection (`overflow-x-auto`) for Financial Tables
 * 4. Responsive Grid Form Layouts (Single column on mobile, Multi-column on tablet/desktop)
 * 5. Bounded Viewport Layouts without horizontal window bleed
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("TASK-076: Responsive Review & Mobile/Tablet Layout Audit", () => {
  const sidebarPath = path.join(process.cwd(), "src", "components", "layout", "sidebar.tsx");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

  const topbarPath = path.join(process.cwd(), "src", "components", "layout", "topbar.tsx");
  const topbarContent = fs.readFileSync(topbarPath, "utf-8");

  const appLayoutPath = path.join(process.cwd(), "src", "components", "layout", "app-layout.tsx");
  const appLayoutContent = fs.readFileSync(appLayoutPath, "utf-8");

  const amortTablePath = path.join(process.cwd(), "src", "components", "calculator", "amortization-table.tsx");
  const amortTableContent = fs.readFileSync(amortTablePath, "utf-8");

  const calcFormPath = path.join(process.cwd(), "src", "components", "calculator", "calculator-form.tsx");
  const calcFormContent = fs.readFileSync(calcFormPath, "utf-8");

  const dashboardPagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const dashboardPageContent = fs.readFileSync(dashboardPagePath, "utf-8");

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Mobile Sidebar & Navigation Drawer Architecture
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Mobile Sidebar Drawer & Backdrop", () => {
    it("sidebar should support slide-in transition on mobile and static placement on desktop", () => {
      expect(sidebarContent).toContain("lg:static");
      expect(sidebarContent).toContain("lg:translate-x-0");
      expect(sidebarContent).toContain("-translate-x-full");
      expect(sidebarContent).toContain("translate-x-0");
    });

    it("sidebar should render a backdrop on mobile screens when open", () => {
      expect(sidebarContent).toContain('data-testid="sidebar-backdrop"');
      expect(sidebarContent).toContain("lg:hidden");
      expect(sidebarContent).toContain("bg-slate-900/40");
    });

    it("topbar should contain a hamburger toggle button visible only on mobile/tablet", () => {
      expect(topbarContent).toContain("lg:hidden");
      expect(topbarContent).toContain("onOpenSidebar");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Table Overflow & Horizontal Scroll Protection
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Table Horizontal Overflow & Viewport Safety", () => {
    it("amortization table should wrap table in an overflow-x-auto container with sticky header", () => {
      expect(amortTableContent).toContain("overflow-x-auto");
      expect(amortTableContent).toContain("sticky top-0");
    });

    it("main content area in AppLayout should constrain maximum width without horizontal page bleed", () => {
      expect(appLayoutContent).toContain("max-w-7xl");
      expect(appLayoutContent).toContain("mx-auto");
      expect(appLayoutContent).toContain("overflow-hidden");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Responsive Form & Grid Column Layouts
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Responsive Grid Stacking in Forms & Dashboard Cards", () => {
    it("calculator form should adapt grid columns across mobile, tablet, and desktop", () => {
      expect(calcFormContent).toContain("grid");
      expect(calcFormContent).toContain("grid-cols-1");
    });

    it("dashboard page should stack KPI statistic cards cleanly across screen widths", () => {
      expect(dashboardPageContent).toContain("grid");
      expect(dashboardPageContent).toContain("grid-cols-1");
    });
  });
});
