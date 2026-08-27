import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultDetail } from "@/components/calculator/result-detail";

describe("TASK-049: Result Detail Sections & Tab Breakdown Tests", () => {
  const mockDetailedData = {
    status: "OK",
    isEligible: true,
    calculationMethod: "FLAT",
    input: {
      customerName: "Budi Santoso",
      customerNip: "196501011989031001",
      birthDate: "1961-01-01",
      netSalary: 8500000,
      otherIncome: 500000,
      otherDeductions: 200000,
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
      principalMonthly: 1666667,
      interestMonthly: 900000,
      totalRepayment: 154000000,
      totalFees: 6500000,
    },
    insurance: {
      rate: 0.025,
      premium: 2500000,
      fronting: 350000,
      reserve: 150000,
      total: 3000000,
    },
    fees: {
      admin: 500000,
      provision: 1000000,
      verification: 1500000,
      flagging: 38000,
      installmentDeduction: 5133334,
      total: 6500000,
    },
    breakdown: {
      age: {
        currentYears: 65,
        currentMonths: 2,
        ageAtMaturityYears: 70,
        maxAgeLimit: 85,
      },
      tenor: {
        requestedMonths: 60,
        insuranceYears: 5,
      },
      interest: {
        annualRate: 0.108,
        monthlyRate: 0.009,
      },
    },
    versions: {
      businessRule: "v1.0.0",
    },
  };

  it("should render default Ringkasan tab with customer and financial data", () => {
    render(<ResultDetail data={mockDetailedData} />);

    expect(screen.getByTestId("tab-content-ringkasan")).toBeDefined();
    expect(screen.getByText("Budi Santoso")).toBeDefined();
    expect(screen.getByText("196501011989031001")).toBeDefined();
    expect(screen.getByText(/100\.000\.000/)).toBeDefined();
  });

  it("should switch to Kelayakan tab and display DBR and age bounds", () => {
    render(<ResultDetail data={mockDetailedData} />);

    const kelayakanTab = screen.getByTestId("tab-kelayakan");
    fireEvent.click(kelayakanTab);

    expect(screen.getByTestId("tab-content-kelayakan")).toBeDefined();
    expect(screen.getByText(/debt burden ratio/i)).toBeDefined();
    expect(screen.getByText("30.20%")).toBeDefined();
    expect(screen.getByText(/usia saat jatuh tempo/i)).toBeDefined();
  });

  it("should switch to Angsuran tab and display installment components", () => {
    render(<ResultDetail data={mockDetailedData} />);

    const angsuranTab = screen.getByTestId("tab-angsuran");
    fireEvent.click(angsuranTab);

    expect(screen.getByTestId("tab-content-angsuran")).toBeDefined();
    expect(screen.getByText(/angsuran pokok/i)).toBeDefined();
    expect(screen.getByText(/angsuran margin/i)).toBeDefined();
    expect(screen.getByText(/total angsuran bulanan/i)).toBeDefined();
  });

  it("should switch to Asuransi tab and display insurance breakdown", () => {
    render(<ResultDetail data={mockDetailedData} />);

    const asuransiTab = screen.getByTestId("tab-asuransi");
    fireEvent.click(asuransiTab);

    expect(screen.getByTestId("tab-content-asuransi")).toBeDefined();
    expect(screen.getByText(/premi jiwa murni/i)).toBeDefined();
    expect(screen.getByText(/fee fronting/i)).toBeDefined();
    expect(screen.getByText(/total biaya asuransi/i)).toBeDefined();
  });

  it("should switch to Rincian Biaya tab and display fee components", () => {
    render(<ResultDetail data={mockDetailedData} />);

    const biayaTab = screen.getByTestId("tab-biaya");
    fireEvent.click(biayaTab);

    expect(screen.getByTestId("tab-content-biaya")).toBeDefined();
    expect(screen.getByText("Biaya Administrasi")).toBeDefined();
    expect(screen.getByText("Biaya Provisi")).toBeDefined();
    expect(screen.getByText("Biaya Verifikasi")).toBeDefined();
    expect(screen.getByText("Biaya Flagging")).toBeDefined();
    expect(screen.getByText("Total Potongan Biaya")).toBeDefined();
  });

  it("should switch to Terima Bersih tab and display net disbursement", () => {
    render(<ResultDetail data={mockDetailedData} />);

    const terimaBersihTab = screen.getByTestId("tab-terimaBersih");
    fireEvent.click(terimaBersihTab);

    expect(screen.getByTestId("tab-content-terima-bersih")).toBeDefined();
    expect(screen.getByText(/estimasi dana bersih diterima/i)).toBeDefined();
    expect(screen.getByTestId("net-disbursement-value").textContent).toContain("93.500.000");
  });

  it("should show '-' on net disbursement tab if status is OVER", () => {
    const overData = {
      ...mockDetailedData,
      status: "OVER",
      isEligible: false,
    };

    render(<ResultDetail data={overData} />);

    const terimaBersihTab = screen.getByTestId("tab-terimaBersih");
    fireEvent.click(terimaBersihTab);

    expect(screen.getByTestId("net-disbursement-value").textContent).toBe("-");
  });
});
