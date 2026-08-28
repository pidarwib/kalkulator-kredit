import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/page";

// Mock Auth Provider with ADMIN role
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "adminbpr",
      fullName: "Admin BPR Sejahtera",
      role: "ADMIN",
      permissions: ["USER_VIEW", "SIMULATION_VIEW", "CREDIT_PARAMETER_VIEW"],
      scope: "BPR",
    },
    hasPermission: (perm: string) => true,
    hasAnyPermission: () => true,
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("TASK-061: Admin Dashboard UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminDashboardData = {
    bprName: "BPR Sejahtera",
    stats: {
      totalMarketing: 18,
      totalSimulations: 156,
      totalPrincipal: 16500000000,
      simulationsToday: 14,
      todayPrincipal: 1450000000,
      eligibleCount: 142,
      overCapacityCount: 14,
      eligibilityRate: 91.0,
      activeProductsCount: 3,
    },
    branches: [
      {
        id: "branch-1",
        name: "Cabang Madiun",
        code: "MDN",
        marketingCount: 8,
        simulationCount: 75,
      },
      {
        id: "branch-2",
        name: "Cabang Surabaya",
        code: "SBY",
        marketingCount: 10,
        simulationCount: 81,
      },
    ],
    recentSimulations: [
      {
        id: "sim-101",
        simulationNumber: "SIM-20260828-101",
        customerName: "Bambang Supriyanto",
        customerNip: "197501012000011001",
        officerName: "Marketing Madiun 01",
        branchName: "Cabang Madiun",
        productName: "Kredit Pensiun Platinum",
        requestedPrincipal: 150000000,
        monthlyInstallment: 2450000,
        eligibilityStatus: "ELIGIBLE",
        totalDbrPercent: 72.5,
        createdAt: "2026-08-28T12:00:00.000Z",
      },
    ],
  };

  it("should render Admin Dashboard view with 4 management KPI cards, branch distribution, and recent simulations", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/dashboard/admin")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockAdminDashboardData }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("dashboard-page-title")).toHaveTextContent(
      "Dashboard Manajemen & Underwriting BPR"
    );
    expect(screen.getAllByText("Admin BPR Sejahtera").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByTestId("admin-kpi-marketing")).toBeInTheDocument();
    });

    // Check 4 Management KPI cards
    expect(screen.getByTestId("admin-marketing-count")).toHaveTextContent("18 Petugas");
    expect(screen.getByTestId("admin-total-sim-count")).toHaveTextContent("156 Pengajuan");
    expect(screen.getByTestId("admin-today-count")).toHaveTextContent("14 Hari Ini");
    expect(screen.getByTestId("admin-eligibility-rate")).toHaveTextContent("91%");

    // Check Branch Distribution
    expect(screen.getByTestId("admin-branches-card")).toBeInTheDocument();
    expect(screen.getAllByText("Cabang Madiun").length).toBeGreaterThan(0);
    expect(screen.getByText("Cabang Surabaya")).toBeInTheDocument();
    expect(screen.getByText("75 Simulasi")).toBeInTheDocument();
    expect(screen.getByText("81 Simulasi")).toBeInTheDocument();

    // Check Recent Table
    expect(screen.getByTestId("recent-simulations-table")).toBeInTheDocument();
    expect(screen.getByTestId("recent-row-sim-101")).toBeInTheDocument();
    expect(screen.getByText("Bambang Supriyanto")).toBeInTheDocument();
    expect(screen.getByText("Marketing Madiun 01")).toBeInTheDocument();
    expect(screen.getByText("LAYAK (ELIGIBLE)")).toBeInTheDocument();
  });
});
