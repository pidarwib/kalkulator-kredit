import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MarketingDashboardPage from "@/app/page";

// Mock Auth Provider
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "marketing-1",
      username: "marketing01",
      fullName: "Budi Santoso",
      role: "MARKETING",
      permissions: ["SIMULATION_VIEW", "CALCULATION_CREATE"],
      scope: "BRANCH",
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

describe("TASK-060: Marketing Dashboard UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDashboardData = {
    stats: {
      simulationsToday: 5,
      todayPrincipal: 450000000,
      totalSimulations: 42,
      totalPrincipal: 4200000000,
      eligibleCount: 38,
      overCapacityCount: 4,
      eligibilityRate: 90.5,
    },
    recentSimulations: [
      {
        id: "sim-1",
        simulationNumber: "SIM-20260828-001",
        customerName: "Ahmad Wijaya",
        customerNip: "198001012005011001",
        productName: "Kredit Pensiun Platinum",
        productCode: "KREDIT_PENSIUN_PLATINUM",
        requestedPrincipal: 100000000,
        monthlyInstallment: 1750000,
        eligibilityStatus: "ELIGIBLE",
        totalDbrPercent: 65.4,
        createdAt: "2026-08-28T10:00:00.000Z",
      },
      {
        id: "sim-2",
        simulationNumber: "SIM-20260828-002",
        customerName: "Siti Rahayu",
        customerNip: "198502022008022002",
        productName: "Kredit Pegawai Aktif",
        productCode: "KREDIT_PEGAWAI",
        requestedPrincipal: 250000000,
        monthlyInstallment: 4200000,
        eligibilityStatus: "OVER_CAPACITY",
        totalDbrPercent: 92.1,
        createdAt: "2026-08-28T11:30:00.000Z",
      },
    ],
  };

  it("should render welcome header, 3 KPI cards, and recent simulations table", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/dashboard/marketing")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockDashboardData }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<MarketingDashboardPage />);

    expect(screen.getByTestId("dashboard-page-title")).toBeInTheDocument();
    expect(screen.getAllByText("Budi Santoso").length).toBeGreaterThan(0);
    expect(screen.getByTestId("dashboard-start-calc-btn")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("kpi-simulations-today")).toBeInTheDocument();
    });

    // Check 3 KPI cards
    expect(screen.getByTestId("kpi-today-count")).toHaveTextContent("5 Pengajuan");
    expect(screen.getByTestId("kpi-total-count")).toHaveTextContent("42 Simulasi");
    expect(screen.getByTestId("kpi-eligibility-value")).toHaveTextContent("90.5%");

    // Check Recent Table
    expect(screen.getByTestId("recent-simulations-table")).toBeInTheDocument();
    expect(screen.getByTestId("recent-row-sim-1")).toBeInTheDocument();
    expect(screen.getByTestId("recent-row-sim-2")).toBeInTheDocument();

    expect(screen.getByText("Ahmad Wijaya")).toBeInTheDocument();
    expect(screen.getByText("LAYAK (ELIGIBLE)")).toBeInTheDocument();
    expect(screen.getByText("Siti Rahayu")).toBeInTheDocument();
    expect(screen.getByText("OVER CAPACITY")).toBeInTheDocument();

    expect(screen.getByTestId("view-detail-btn-sim-1")).toBeInTheDocument();
  });

  it("should render empty state when no simulations are found", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/dashboard/marketing")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              stats: {
                simulationsToday: 0,
                todayPrincipal: 0,
                totalSimulations: 0,
                totalPrincipal: 0,
                eligibleCount: 0,
                overCapacityCount: 0,
                eligibilityRate: 100,
              },
              recentSimulations: [],
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<MarketingDashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-empty-simulations")).toBeInTheDocument();
    });

    expect(screen.getByText("Belum ada simulasi kredit yang tersimpan.")).toBeInTheDocument();
  });
});
