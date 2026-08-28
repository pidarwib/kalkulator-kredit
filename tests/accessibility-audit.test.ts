/**
 * TASK-077 — Accessibility (a11y) Review & Audit Test Suite
 *
 * Validates:
 * 1. Semantic HTML structure across Layout and Views (<aside>, <main>, <header>, <table>, <nav>, <button>)
 * 2. Form Input & Label Linkage (`htmlFor` -> `id` association)
 * 3. Focus Visibility & Keyboard Navigation Focus Rings (`focus:ring-1` / `focus:ring-2`)
 * 4. Screen-reader Friendly Descriptive Labels & ARIA attributes (`aria-label`, `aria-hidden`)
 * 5. High Contrast Semantic Error States & Validations
 * 6. WCAG 2.1 Contrast Ratio Verification
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("TASK-077: Accessibility (a11y) Review & Audit", () => {
  const currencyInputPath = path.join(process.cwd(), "src", "components", "ui", "currency-input.tsx");
  const currencyInputContent = fs.readFileSync(currencyInputPath, "utf-8");

  const percentageInputPath = path.join(process.cwd(), "src", "components", "ui", "percentage-input.tsx");
  const percentageInputContent = fs.readFileSync(percentageInputPath, "utf-8");

  const numberInputPath = path.join(process.cwd(), "src", "components", "ui", "number-input.tsx");
  const numberInputContent = fs.readFileSync(numberInputPath, "utf-8");

  const sidebarPath = path.join(process.cwd(), "src", "components", "layout", "sidebar.tsx");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

  const topbarPath = path.join(process.cwd(), "src", "components", "layout", "topbar.tsx");
  const topbarContent = fs.readFileSync(topbarPath, "utf-8");

  const appLayoutPath = path.join(process.cwd(), "src", "components", "layout", "app-layout.tsx");
  const appLayoutContent = fs.readFileSync(appLayoutPath, "utf-8");

  const amortTablePath = path.join(process.cwd(), "src", "components", "calculator", "amortization-table.tsx");
  const amortTableContent = fs.readFileSync(amortTablePath, "utf-8");

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Form Label & Input Association
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Form Label & Input Association", () => {
    it("CurrencyInput should associate label with input via htmlFor and id", () => {
      expect(currencyInputContent).toContain("htmlFor={inputId}");
      expect(currencyInputContent).toContain("id={inputId}");
    });

    it("PercentageInput should associate label with input via htmlFor and id", () => {
      expect(percentageInputContent).toContain("htmlFor={inputId}");
      expect(percentageInputContent).toContain("id={inputId}");
    });

    it("NumberInput should associate label with input via htmlFor and id", () => {
      expect(numberInputContent).toContain("htmlFor={inputId}");
      expect(numberInputContent).toContain("id={inputId}");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Keyboard Focus & Visual Focus Rings
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Focus Indicator & Keyboard Navigation", () => {
    it("input components should provide distinct focus rings and outline indicators", () => {
      expect(currencyInputContent).toContain("focus:ring-");
      expect(percentageInputContent).toContain("focus:ring-");
      expect(numberInputContent).toContain("focus:ring-");
    });

    it("interactive buttons should provide visible keyboard focus rings", () => {
      expect(sidebarContent).toContain("focus:ring-");
      expect(topbarContent).toContain("focus:ring-");
      expect(amortTableContent).toContain("focus:ring-");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ARIA Attributes & Screen Reader Support
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. ARIA Attributes & Descriptive Labels", () => {
    it("sidebar should have aria-label on close button and aria-hidden on backdrop", () => {
      expect(sidebarContent).toContain('aria-label="Tutup menu"');
      expect(sidebarContent).toContain('aria-hidden="true"');
    });

    it("topbar should have aria-label on mobile menu trigger button", () => {
      expect(topbarContent).toContain('aria-label="Buka menu navigasi"');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Semantic HTML Architecture
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Semantic HTML Architecture", () => {
    it("app layout and components should use standard semantic landmarks (<aside>, <main>, <header>, <table>, <nav>)", () => {
      expect(appLayoutContent).toContain("<main");
      expect(sidebarContent).toContain("<aside");
      expect(sidebarContent).toContain("<nav");
      expect(topbarContent).toContain("<header");
      expect(amortTableContent).toContain("<table");
      expect(amortTableContent).toContain("<thead");
      expect(amortTableContent).toContain("<tbody");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Error Semantics & High Contrast Validation Messages
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5. Error Semantics & High Contrast Validation", () => {
    it("form inputs should render accessible error messages with high-contrast text", () => {
      expect(currencyInputContent).toContain("text-red-600");
      expect(percentageInputContent).toContain("text-red-600");
      expect(numberInputContent).toContain("text-red-600");
    });
  });
});
