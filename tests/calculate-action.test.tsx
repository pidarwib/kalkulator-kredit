import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CalculatorPage from "@/app/calculator/page";

// Mock Next.js navigation and layout dependencies
vi.mock("next/navigation", () => ({
  usePathname: () => "/calculator",
}));

describe("TASK-047: Calculate Action End-to-End Flow Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete flow: validate -> POST /calculations -> loading -> display result", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              { id: "prod-1", code: "PLATINUM_MADIUN", name: "Kredit Pensiun Platinum" },
            ],
          }),
        });
      }
      if (url.includes("/api/v1/payment-offices")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        });
      }
      if (url.includes("/api/v1/calculations")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              status: "OK",
              isEligible: true,
              calculationMethod: "FLAT",
              input: {
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
              versions: {
                businessRule: "v1.0.0",
              },
              reasons: [],
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CalculatorPage />);

    // Wait for dropdown to populate
    await waitFor(() => {
      expect(screen.getByText(/kredit pensiun platinum/i)).toBeDefined();
    });

    const submitBtn = screen.getByTestId("calculate-submit-btn");
    fireEvent.click(submitBtn);

    // Should display calculation summary result
    await waitFor(() => {
      expect(screen.getByTestId("calculation-summary-result")).toBeDefined();
      expect(screen.getByText(/hasil analisis kelayakan/i)).toBeDefined();
      expect(screen.getByText(/eligible/i)).toBeDefined();
      expect(screen.getByText("30.20%")).toBeDefined();
    });
  });

  it("should disable submit button and show loading indicator while request is in flight", async () => {
    let resolveCalc: (val: any) => void;
    const calcPromise = new Promise((resolve) => {
      resolveCalc = resolve;
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ id: "prod-1", code: "PLATINUM", name: "Kredit Platinum" }],
          }),
        });
      }
      if (url.includes("/api/v1/payment-offices")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      if (url.includes("/api/v1/calculations")) {
        return calcPromise;
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CalculatorPage />);

    await waitFor(() => {
      expect(screen.getByText(/kredit platinum/i)).toBeDefined();
    });

    const submitBtn = screen.getByTestId("calculate-submit-btn") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    fireEvent.click(submitBtn);

    // Button should be disabled with loading text
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent).toContain("Memproses Perhitungan...");

    // Resolve network request
    resolveCalc!({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          status: "OK",
          isEligible: true,
          calculationMethod: "FLAT",
          input: { tenorMonths: 60 },
          result: {
            installment: 2500000,
            dbr: 0.25,
            remainingSalary: 6000000,
            maximumPrincipal: 150000000,
            netDisbursement: 94000000,
          },
        },
      }),
    });

    await waitFor(() => {
      expect(submitBtn.disabled).toBe(false);
      expect(submitBtn.textContent).toContain("Hitung Simulasi");
    });
  });

  it("should handle error response according to API error contract and display alert banner", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ id: "prod-1", code: "PLATINUM", name: "Kredit Platinum" }],
          }),
        });
      }
      if (url.includes("/api/v1/payment-offices")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      if (url.includes("/api/v1/calculations")) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter produk tidak ditemukan untuk tenor 60 bulan.",
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CalculatorPage />);

    await waitFor(() => {
      expect(screen.getByText(/kredit platinum/i)).toBeDefined();
    });

    const submitBtn = screen.getByTestId("calculate-submit-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("calculator-error-banner")).toBeDefined();
      expect(
        screen.getByText(/parameter produk tidak ditemukan untuk tenor 60 bulan/i)
      ).toBeDefined();
      expect(screen.queryByTestId("calculation-summary-result")).toBeNull();
    });
  });
});
