import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultSummary, CalculationResultData } from "@/components/calculator/result-summary";

describe("TASK-048: Result Summary Component Tests", () => {
  const mockEligibleData: CalculationResultData = {
    status: "OK",
    isEligible: true,
    calculationMethod: "FLAT",
    input: {
      birthDate: "1975-01-01",
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
    versions: {
      businessRule: "v1.0.0",
    },
    reasons: [],
  };

  const mockOverData: CalculationResultData = {
    status: "OVER",
    isEligible: false,
    calculationMethod: "FLAT",
    input: {
      birthDate: "1975-01-01",
      netSalary: 2000000,
      productId: "prod-1",
      requestedPrincipal: 150000000,
      tenorMonths: 60,
    },
    result: {
      installment: 3850000,
      dbr: 1.925,
      remainingSalary: -1850000,
      maximumPrincipal: 35000000,
      netDisbursement: 140000000,
    },
    versions: {
      businessRule: "v1.0.0",
    },
    reasons: [
      "Angsuran melebihi batas DBR maksimal 90% dari gaji bersih.",
      "Plafon pengajuan melebihi kapasitas kemampuan bayar debitur.",
    ],
  };

  it("should render all primary result KPIs for ELIGIBLE calculation", () => {
    render(<ResultSummary data={mockEligibleData} />);

    // 1. Status
    expect(screen.getByTestId("status-badge").textContent).toContain("ELIGIBLE");

    // 2. Maximum Principal
    expect(screen.getByTestId("kpi-maximum-principal").textContent).toContain("180.000.000");

    // 3. Monthly Installment
    expect(screen.getByTestId("kpi-installment").textContent).toContain("2.566.667");

    // 4. DBR
    expect(screen.getByTestId("kpi-dbr").textContent).toContain("30.20%");

    // 5. Net Disbursement
    expect(screen.getByTestId("kpi-net-disbursement").textContent).toContain("93.500.000");

    // Should NOT show reasons box
    expect(screen.queryByTestId("eligibility-reasons-box")).toBeNull();
  });

  it("should render NOT ELIGIBLE badge and failure reasons list when status is OVER", () => {
    render(<ResultSummary data={mockOverData} />);

    // Status
    expect(screen.getByTestId("status-badge").textContent).toContain("NOT ELIGIBLE");

    // Reasons box
    const reasonsBox = screen.getByTestId("eligibility-reasons-box");
    expect(reasonsBox).toBeDefined();
    expect(reasonsBox.textContent).toContain("Angsuran melebihi batas DBR maksimal 90%");
    expect(reasonsBox.textContent).toContain("Plafon pengajuan melebihi kapasitas");
  });

  it("should trigger onSaveSimulation when save button is clicked", () => {
    const handleSave = vi.fn();
    render(<ResultSummary data={mockEligibleData} onSaveSimulation={handleSave} />);

    const saveBtn = screen.getByTestId("save-simulation-btn");
    expect(saveBtn).toBeDefined();

    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledTimes(1);
  });
});
