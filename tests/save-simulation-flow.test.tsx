import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CalculatorPage from "@/app/calculator/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/calculator",
}));

describe("TASK-051: Save Simulation Flow Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProductData = {
    data: [{ id: "prod-1", code: "PLATINUM", name: "Kredit Pensiun Platinum" }],
  };

  const mockCalculationData = {
    status: "OK",
    isEligible: true,
    calculationMethod: "FLAT",
    input: {
      customerName: "Budi Santoso",
      customerNip: "196501011989031001",
      birthDate: "1961-01-01",
      netSalary: 8500000,
      productId: "prod-1",
      requestedPrincipal: 100000000,
      tenorMonths: 60,
    },
    result: {
      installment: 2566667,
      dbr: 0.302,
      remainingSalary: 5933333,
      maximumPrincipal: 180000000,
      netDisbursement: 93500000,
    },
    schedule: [
      {
        period: 1,
        openingBalance: 100000000,
        principal: 1666667,
        interest: 900000,
        installment: 2566667,
        closingBalance: 98333333,
      },
    ],
  };

  it("should complete save simulation flow: click save -> POST /simulations -> success feedback -> link to detail", async () => {
    let saveCalled = false;

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockProductData,
        });
      }
      if (url.includes("/api/v1/payment-offices")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      if (url.includes("/api/v1/calculations")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: mockCalculationData }),
        });
      }
      if (url.includes("/api/v1/simulations") && opts?.method === "POST") {
        saveCalled = true;
        const body = JSON.parse(opts.body);
        expect(body.productId).toBe("prod-1");
        expect(body.requestedPrincipal).toBe(100000000);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              id: "sim-12345",
              simulationNumber: "SIM-202608-0088",
              status: "OK",
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CalculatorPage />);

    await waitFor(() => {
      expect(screen.getByText(/kredit pensiun platinum/i)).toBeDefined();
    });

    // 1. Trigger calculate
    const calculateBtn = screen.getByTestId("calculate-submit-btn");
    fireEvent.click(calculateBtn);

    // 2. Wait for result to render
    await waitFor(() => {
      expect(screen.getByTestId("save-simulation-btn")).toBeDefined();
    });

    const saveBtn = screen.getByTestId("save-simulation-btn") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);

    // 3. Click Save Simulation
    fireEvent.click(saveBtn);

    // 4. Verify Success feedback
    await waitFor(() => {
      expect(saveCalled).toBe(true);
      expect(screen.getByTestId("calculator-success-banner")).toBeDefined();
      expect(screen.getByText(/SIM-202608-0088/)).toBeDefined();
    });

    // 5. Check Link to Simulation Detail
    const detailLink = screen.getByTestId("banner-view-simulation-link") as HTMLAnchorElement;
    expect(detailLink).toBeDefined();
    expect(detailLink.getAttribute("href")).toBe("/simulations/sim-12345");

    // 6. Check Save button updated to 'Tersimpan ✓' and disabled against duplicate clicks
    expect(saveBtn.textContent).toContain("Tersimpan ✓");
    expect(saveBtn.disabled).toBe(true);
  });

  it("should handle error gracefully when POST /simulations fails", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({ ok: true, json: async () => mockProductData });
      }
      if (url.includes("/api/v1/payment-offices")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      if (url.includes("/api/v1/calculations")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: mockCalculationData }),
        });
      }
      if (url.includes("/api/v1/simulations") && opts?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({
            error: {
              code: "FORBIDDEN",
              message: "Anda tidak memiliki izin menyimpan simulasi kredit.",
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CalculatorPage />);

    await waitFor(() => {
      expect(screen.getByText(/kredit pensiun platinum/i)).toBeDefined();
    });

    const calculateBtn = screen.getByTestId("calculate-submit-btn");
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(screen.getByTestId("save-simulation-btn")).toBeDefined();
    });

    const saveBtn = screen.getByTestId("save-simulation-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId("calculator-error-banner")).toBeDefined();
      expect(
        screen.getByText(/anda tidak memiliki izin menyimpan simulasi kredit/i)
      ).toBeDefined();
    });
  });
});
