import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageHeader, Sidebar, Topbar, AppLayout } from "@/components/layout";
import { defaultNavigationGroups } from "@/components/layout/sidebar";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("TASK-004: Base Layout Components", () => {
  describe("PageHeader", () => {
    it("should render title, description, and breadcrumbs", () => {
      render(
        <PageHeader
          title="Kalkulator Kredit"
          description="Form simulasi kredit"
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Kalkulator" }]}
          actions={<button>Aksi</button>}
        />
      );

      expect(screen.getByText("Kalkulator Kredit")).toBeInTheDocument();
      expect(screen.getByText("Form simulasi kredit")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Kalkulator")).toBeInTheDocument();
      expect(screen.getByText("Aksi")).toBeInTheDocument();
    });
  });

  describe("Sidebar", () => {
    it("should render brand header and navigation items", () => {
      render(<Sidebar isOpen={true} onClose={() => {}} navigation={defaultNavigationGroups} />);

      expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
      expect(screen.getByText("Credit Calculator")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Kalkulator Kredit")).toBeInTheDocument();
      expect(screen.getByText("Daftar Simulasi")).toBeInTheDocument();
      expect(screen.getByText("Manajemen User")).toBeInTheDocument();
      expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    });

    it("should trigger onClose when close button or backdrop is clicked", () => {
      const handleClose = vi.fn();
      render(<Sidebar isOpen={true} onClose={handleClose} />);

      const backdrop = screen.getByTestId("sidebar-backdrop");
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("Topbar", () => {
    it("should render organization context and user role", () => {
      render(
        <Topbar
          organizationName="BPR Mitra Mandiri"
          userName="Budi Santoso"
          userRole="MARKETING"
        />
      );

      expect(screen.getByTestId("app-topbar")).toBeInTheDocument();
      expect(screen.getByText("BPR Mitra Mandiri")).toBeInTheDocument();
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
      expect(screen.getByText("MARKETING")).toBeInTheDocument();
    });

    it("should trigger onOpenSidebar when hamburger button is clicked", () => {
      const handleOpen = vi.fn();
      render(<Topbar onOpenSidebar={handleOpen} />);

      const menuBtn = screen.getByLabelText("Buka menu navigasi");
      fireEvent.click(menuBtn);
      expect(handleOpen).toHaveBeenCalled();
    });
  });

  describe("AppLayout", () => {
    it("should render full shell with sidebar, topbar, and main content", () => {
      render(
        <AppLayout
          organizationName="BPR Kota Sejahtera"
          userName="Admin Staff"
          userRole="ADMIN"
        >
          <div data-testid="test-child">Child Content Area</div>
        </AppLayout>
      );

      expect(screen.getByTestId("app-layout")).toBeInTheDocument();
      expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("app-topbar")).toBeInTheDocument();
      expect(screen.getByTestId("main-content")).toBeInTheDocument();
      expect(screen.getByTestId("test-child")).toBeInTheDocument();
    });
  });
});
