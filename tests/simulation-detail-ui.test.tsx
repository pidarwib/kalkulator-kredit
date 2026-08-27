import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SimulationDetailPage from "@/app/simulations/[id]/page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "sim-12345" }),
  usePathname: () => "/simulations/sim-12345",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("TASK-053: Simulation Detail UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSimulationDetail = {
    id: "sim-12345",
    simulationNumber: "SIM-202608-0001",
    status: "SAVED",
    customerName: "Ahmad Dahlan",
    customerNip: "197505121998031001",
    calculationMethod: "FLAT",
    businessRuleVersion: "BR-1.0",
    parameterVersion: "v1.2",
    createdAt: "2026-08-25T08:30:00.000Z",
    updatedAt: "2026-08-25T08:30:00.000Z",
    user: {
      id: "user-1",
      fullName: "Budi Marketing",
      username: "marketing1",
      email: "marketing1@bpr.co.id",
      role: "MARKETING",
    },
    bpr: {
      id: "bpr-1",
      code: "BPR01",
      name: "BPR Sejahtera",
    },
    branch: {
      id: "branch-1",
      code: "BR01",
      name: "Cabang Bandung",
    },
    paymentOffice: {
      id: "po-1",
      code: "POS",
      name: "PT POS INDONESIA",
    },
    product: {
      id: "prod-1",
      code: "KREDIT_PENSIUN",
      name: "Kredit Pensiun Platinum",
      calculationMethod: "FLAT",
    },
    input: {
      customerName: "Ahmad Dahlan",
      customerNip: "197505121998031001",
      birthDate: "1970-05-12",
      netSalary: 10000000,
      otherIncome: 2000000,
      requestedPrincipal: 100000000,
      tenorMonths: 60,
      productId: "prod-1",
      paymentOfficeId: "po-1",
    },
    result: {
      maximumPrincipal: 100000000,
      installment: 2566667,
      dbr: 0.256,
      remainingSalary: 7433333,
      totalFees: 3500000,
      flaggingFee: 50000,
      payoffAmount: 0,
      netDisbursement: 94000000,
    },
    insurance: {
      rate: 0.025,
      premium: 2500000,
      fronting: 150000,
      reserve: 2350000,
    },
    fees: {
      admin: 500000,
      provision: 500000,
      verification: 0,
      flagging: 50000,
      installmentDeduction: 0,
    },
    versions: {
      businessRule: "BR-1.0",
      parameter: "v1.2",
    },
    reasons: [],
    schedule: [
      {
        period: 1,
        paymentDate: "2026-09-25",
        openingBalance: 100000000,
        principalPortion: 1666667,
        interestPortion: 900000,
        installment: 2566667,
        closingBalance: 98333333,
      },
      {
        period: 2,
        paymentDate: "2026-10-25",
        openingBalance: 98333333,
        principalPortion: 1666667,
        interestPortion: 900000,
        installment: 2566667,
        closingBalance: 96666666,
      },
    ],
  };

  it("should render full simulation detail with metadata, versions, input snapshot, KPI cards, breakdown, and amortization", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/simulations/sim-12345")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockSimulationDetail }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: "Not found" } }),
      });
    });

    render(<SimulationDetailPage />);

    // Initial loading indicator
    expect(screen.getByTestId("simulation-detail-loading")).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByTestId("simulation-detail-title")).toBeInTheDocument();
    });

    // Verify Simulation Number & Status
    expect(screen.getByText("SIM-202608-0001")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-status-badge")).toHaveTextContent("ELIGIBLE");

    // Verify Meta Card (Creator, BPR, Versions)
    const metaCard = screen.getByTestId("simulation-meta-card");
    expect(metaCard).toHaveTextContent("Budi Marketing");
    expect(metaCard).toHaveTextContent("BPR Sejahtera");
    expect(metaCard).toHaveTextContent("v1.2");
    expect(metaCard).toHaveTextContent("BR-1.0");

    // Verify Input Snapshot Card
    const inputCard = screen.getByTestId("simulation-input-card");
    expect(inputCard).toHaveTextContent("Ahmad Dahlan");
    expect(inputCard).toHaveTextContent("197505121998031001");
    expect(inputCard).toHaveTextContent("PT POS INDONESIA");
    expect(inputCard).toHaveTextContent("Kredit Pensiun Platinum");
    expect(inputCard).toHaveTextContent("60 Bulan");

    // Verify KPI Summary
    const kpiSummary = screen.getByTestId("simulation-kpi-summary");
    expect(kpiSummary).toHaveTextContent("Plafon Maksimal");
    expect(kpiSummary).toHaveTextContent("Angsuran Bulanan");
    expect(kpiSummary).toHaveTextContent("Debt Burden Ratio (DBR)");
    expect(kpiSummary).toHaveTextContent("Estimasi Terima Bersih");

    // Verify Amortization Table
    expect(screen.getByTestId("amortization-table")).toBeInTheDocument();
    expect(screen.getByTestId("amortization-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("amortization-row-2")).toBeInTheDocument();
  });

  it("should render error state if API returns 404", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({
          error: { message: "Simulasi dengan ID tidak ditemukan." },
        }),
      })
    );

    render(<SimulationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("simulation-detail-error")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Simulasi tidak ditemukan atau telah dihapus.")
    ).toBeInTheDocument();
  });

  it("should render over capacity badge and reasons if simulation is not eligible", async () => {
    const overSimulation = {
      ...mockSimulationDetail,
      status: "OVER",
      reasons: ["DBR melebihi batas maksimum 90%", "Plafon melebihi kapasitas angsuran"],
    };

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ data: overSimulation }),
      })
    );

    render(<SimulationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("simulation-detail-title")).toBeInTheDocument();
    });

    expect(screen.getByTestId("simulation-status-badge")).toHaveTextContent("OVER CAPACITY");
    expect(screen.getByTestId("simulation-over-reasons-alert")).toHaveTextContent(
      "DBR melebihi batas maksimum 90%"
    );
  });
});
