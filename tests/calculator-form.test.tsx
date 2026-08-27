import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CalculatorForm } from "@/components/calculator/calculator-form";

describe("TASK-044: Calculator Form UI & Logic Tests", () => {
  const mockOnCalculate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/products")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              { id: "prod-1", code: "PLATINUM_MADIUN", name: "Kredit Pensiun Platinum" },
              { id: "prod-2", code: "GOLD_MADIUN", name: "Kredit Pensiun Gold" },
            ],
          }),
        });
      }
      if (url.includes("/api/v1/payment-offices")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              { id: "po-1", code: "POS_MADIUN", name: "Kantor Pos Madiun" },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
    });
  });

  it("should render all required fields: applicant data, birth date, salary, product, principal, tenor, method", async () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} />);

    // Check Applicant Fields
    expect(screen.getByLabelText(/nama lengkap nasabah/i)).toBeDefined();
    expect(screen.getByLabelText(/nip \/ nomor identitas/i)).toBeDefined();
    expect(screen.getByLabelText(/tanggal lahir/i)).toBeDefined();
    expect(screen.getByLabelText(/gaji bersih/i)).toBeDefined();
    expect(screen.getByLabelText(/penghasilan lain/i)).toBeDefined();
    expect(screen.getByLabelText(/potongan pinjaman luar/i)).toBeDefined();

    // Check Loan Facility Fields
    expect(screen.getByLabelText(/produk kredit/i)).toBeDefined();
    expect(screen.getByLabelText(/kantor bayar/i)).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: /metode perhitungan/i })).toBeDefined();
    expect(screen.getByLabelText(/plafon dimohon/i)).toBeDefined();
    expect(screen.getByLabelText(/tenor pinjaman/i)).toBeDefined();
    expect(screen.getByLabelText(/pelunasan takeover/i)).toBeDefined();

    // Check Submit Button
    const submitBtn = screen.getByTestId("calculate-submit-btn");
    expect(submitBtn).toBeDefined();
    expect(submitBtn.textContent).toContain("Hitung Simulasi");
  });

  it("should load and populate products into dropdown", async () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} />);

    await waitFor(() => {
      expect(screen.getByText(/kredit pensiun platinum/i)).toBeDefined();
      expect(screen.getByText(/kredit pensiun gold/i)).toBeDefined();
    });
  });

  it("should toggle between FLAT and ANNUITY methods correctly", () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} />);

    const flatBtn = screen.getByTestId("method-flat-btn");
    const annuityBtn = screen.getByTestId("method-annuity-btn");

    expect(flatBtn.className).toContain("border-indigo-600");

    fireEvent.click(annuityBtn);
    expect(annuityBtn.className).toContain("border-indigo-600");
  });

  it("should submit form data to onCalculate when valid", async () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} />);

    // Wait for dropdown to populate
    await waitFor(() => {
      expect(screen.getByText(/kredit pensiun platinum/i)).toBeDefined();
    });

    const nameInput = screen.getByLabelText(/nama lengkap nasabah/i);
    const principalInput = screen.getByLabelText(/plafon dimohon/i);
    const tenorInput = screen.getByLabelText(/tenor pinjaman/i);
    const submitBtn = screen.getByTestId("calculate-submit-btn");

    fireEvent.change(nameInput, { target: { value: "Budi Santoso" } });
    fireEvent.change(principalInput, { target: { value: "100000000" } });
    fireEvent.change(tenorInput, { target: { value: "60" } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnCalculate).toHaveBeenCalledTimes(1);
      expect(mockOnCalculate).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: "Budi Santoso",
          requestedPrincipal: 100000000,
          tenorMonths: 60,
          calculationMethod: "FLAT",
          birthDate: "1975-01-01",
        })
      );
    });
  });

  it("should reset form fields when reset button is clicked", async () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} />);

    const nameInput = screen.getByLabelText(/nama lengkap nasabah/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Nama Sementara" } });
    expect(nameInput.value).toBe("Nama Sementara");

    const resetBtn = screen.getByTestId("calculator-reset-btn");
    fireEvent.click(resetBtn);

    expect(nameInput.value).toBe("");
  });
});
