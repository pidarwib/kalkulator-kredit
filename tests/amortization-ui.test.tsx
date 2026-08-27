import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AmortizationTable, AmortizationRow } from "@/components/calculator/amortization-table";

describe("TASK-050: Amortization UI Table Tests", () => {
  // Generate 24 months sample schedule
  const mockSchedule: AmortizationRow[] = Array.from({ length: 24 }, (_, i) => {
    const period = i + 1;
    const opening = 24000000 - i * 1000000;
    const principal = 1000000;
    const interest = 200000;
    const installment = 1200000;
    const closing = opening - principal;
    return {
      period,
      openingBalance: opening,
      principal,
      interest,
      installment,
      closingBalance: closing,
    };
  });

  it("should render amortization table with all required columns and sticky headers", () => {
    render(<AmortizationTable schedule={mockSchedule} calculationMethod="FLAT" />);

    expect(screen.getByTestId("amortization-table-container")).toBeDefined();
    expect(screen.getByText(/tabel jadwal angsuran & amortisasi/i)).toBeDefined();

    // Check Table Headers
    expect(screen.getByText("Bln")).toBeDefined();
    expect(screen.getByText("Pokok Awal (Rp)")).toBeDefined();
    expect(screen.getByText("Angsuran Pokok (Rp)")).toBeDefined();
    expect(screen.getByText("Margin / Bunga (Rp)")).toBeDefined();
    expect(screen.getByText("Total Angsuran (Rp)")).toBeDefined();
    expect(screen.getByText("Pokok Akhir (Rp)")).toBeDefined();
  });

  it("should format numbers with right alignment and monospace tabular numbers", () => {
    render(<AmortizationTable schedule={mockSchedule} calculationMethod="FLAT" />);

    const row1 = screen.getByTestId("amortization-row-1");
    expect(row1).toBeDefined();

    const cells = row1.querySelectorAll("td");
    expect(cells.length).toBe(6);

    // Period (cell 0) -> center
    expect(cells[0].className).toContain("text-center");

    // Opening balance (cell 1) -> right aligned & monospace
    expect(cells[1].className).toContain("text-right");
    expect(cells[1].className).toContain("tabular-nums");
    expect(cells[1].textContent).toContain("24.000.000");

    // Principal (cell 2) -> right aligned & monospace
    expect(cells[2].className).toContain("text-right");
    expect(cells[2].textContent).toContain("1.000.000");

    // Installment (cell 4) -> right aligned & bold
    expect(cells[4].className).toContain("text-right");
    expect(cells[4].textContent).toContain("1.200.000");
  });

  it("should calculate and render summary totals in table footer", () => {
    const { container } = render(<AmortizationTable schedule={mockSchedule} calculationMethod="FLAT" />);

    // Total Principal = 24 * 1.000.000 = 24.000.000
    // Total Interest = 24 * 200.000 = 4.800.000
    // Total Installment = 24 * 1.200.000 = 28.800.000
    const tfoot = container.querySelector("tfoot");
    expect(tfoot).toBeDefined();
    expect(tfoot?.textContent).toContain("24.000.000");
    expect(tfoot?.textContent).toContain("4.800.000");
    expect(tfoot?.textContent).toContain("28.800.000");
  });

  it("should paginate correctly with default 12 rows per page and navigate between pages", () => {
    render(<AmortizationTable schedule={mockSchedule} calculationMethod="FLAT" />);

    // Month 1 to 12 should be visible
    expect(screen.getByTestId("amortization-row-1")).toBeDefined();
    expect(screen.getByTestId("amortization-row-12")).toBeDefined();
    expect(screen.queryByTestId("amortization-row-13")).toBeNull();

    // Click Next Page
    const nextBtn = screen.getByTestId("amortization-page-next");
    fireEvent.click(nextBtn);

    // Month 13 to 24 should now be visible
    expect(screen.queryByTestId("amortization-row-1")).toBeNull();
    expect(screen.getByTestId("amortization-row-13")).toBeDefined();
    expect(screen.getByTestId("amortization-row-24")).toBeDefined();
  });

  it("should allow changing page size to show all rows", () => {
    render(<AmortizationTable schedule={mockSchedule} calculationMethod="FLAT" />);

    const select = screen.getByTestId("amortization-pagesize-select");
    fireEvent.change(select, { target: { value: "24" } });

    // All rows 1 to 24 should be visible simultaneously
    expect(screen.getByTestId("amortization-row-1")).toBeDefined();
    expect(screen.getByTestId("amortization-row-24")).toBeDefined();
  });

  it("should display empty state when schedule is empty", () => {
    render(<AmortizationTable schedule={[]} />);

    expect(screen.getByTestId("amortization-empty")).toBeDefined();
    expect(screen.getByText(/jadwal amortisasi belum tersedia/i)).toBeDefined();
  });
});
