import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SimulationsPage from "@/app/simulations/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/simulations",
}));

describe("TASK-052: Simulation List Page UI & Filter Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProducts = [
    { id: "prod-1", code: "PLATINUM", name: "Kredit Platinum" },
  ];

  const mockSimulations = [
    {
      id: "sim-1",
      simulationNumber: "SIM-202608-0001",
      customerName: "Budi Santoso",
      customerNip: "196501011989031001",
      requestedPrincipal: 100000000,
      tenorMonths: 60,
      calculationMethod: "FLAT",
      status: "OK",
      isEligible: true,
      dbr: 0.302,
      installment: 2566667,
      createdAt: "2026-08-25T10:00:00.000Z",
      product: { id: "prod-1", code: "PLATINUM", name: "Kredit Platinum" },
    },
    {
      id: "sim-2",
      simulationNumber: "SIM-202608-0002",
      customerName: "Siti Rahma",
      customerNip: "197203041995032002",
      requestedPrincipal: 250000000,
      tenorMonths: 36,
      calculationMethod: "ANNUITY",
      status: "OVER",
      isEligible: false,
      dbr: 0.945,
      installment: 8900000,
      createdAt: "2026-08-26T14:30:00.000Z",
      product: { id: "prod-1", code: "PLATINUM", name: "Kredit Platinum" },
    },
  ];

  it("should render page header, filters, and list table with data", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockProducts }),
        });
      }
      if (url.includes("/api/v1/simulations")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: mockSimulations,
            meta: {
              page: 1,
              pageSize: 10,
              totalCount: 2,
              totalPages: 1,
              hasPrev: false,
              hasNext: false,
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<SimulationsPage />);

    // Check loading indicator first
    expect(screen.getByTestId("simulations-loading")).toBeDefined();

    // Wait for table to render
    await waitFor(() => {
      expect(screen.getByTestId("simulations-table")).toBeDefined();
    });

    // Check Row 1
    expect(screen.getByText("SIM-202608-0001")).toBeDefined();
    expect(screen.getByText("Budi Santoso")).toBeDefined();
    expect(screen.getByTestId("badge-status-sim-1").textContent).toBe("ELIGIBLE");

    // Check Row 2
    expect(screen.getByText("SIM-202608-0002")).toBeDefined();
    expect(screen.getByText("Siti Rahma")).toBeDefined();
    expect(screen.getByTestId("badge-status-sim-2").textContent).toBe("OVER");

    // Check detail links
    const viewBtn = screen.getByTestId("btn-view-sim-1") as HTMLAnchorElement;
    expect(viewBtn).toBeDefined();
    expect(viewBtn.getAttribute("href")).toBe("/simulations/sim-1");
  });

  it("should filter simulations by search input and status dropdown", async () => {
    let capturedUrl = "";

    global.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: mockProducts }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [mockSimulations[0]],
          meta: { page: 1, pageSize: 10, totalCount: 1, totalPages: 1, hasPrev: false, hasNext: false },
        }),
      });
    });

    render(<SimulationsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("simulations-table")).toBeDefined();
    });

    // Type search
    const searchInput = screen.getByTestId("search-simulation-input");
    fireEvent.change(searchInput, { target: { value: "Budi" } });

    // Change status
    const statusSelect = screen.getByTestId("filter-status-select");
    fireEvent.change(statusSelect, { target: { value: "OK" } });

    await waitFor(() => {
      expect(capturedUrl).toContain("search=Budi");
      expect(capturedUrl).toContain("status=OK");
    });
  });

  it("should display empty state when no simulations are found", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [],
          meta: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrev: false, hasNext: false },
        }),
      });
    });

    render(<SimulationsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("simulations-empty-state")).toBeDefined();
      expect(screen.getByText(/tidak ada simulasi ditemukan/i)).toBeDefined();
    });
  });
});
