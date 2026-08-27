import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CalculatorForm } from "@/components/calculator/calculator-form";

describe("TASK-046: Calculator Validation UX Tests", () => {
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
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
    });
  });

  it("should display inline error when required fields are missing or invalid on submit", async () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} />);

    // Wait for product to load
    await waitFor(() => {
      expect(screen.getByText(/kredit pensiun platinum/i)).toBeDefined();
    });

    const birthDateInput = screen.getByLabelText(/tanggal lahir/i);
    const principalInput = screen.getByLabelText(/plafon dimohon/i);
    const salaryInput = screen.getByLabelText(/gaji bersih/i);
    const form = screen.getByTestId("calculator-form");

    // Clear birthDate & principal
    fireEvent.change(birthDateInput, { target: { value: "" } });
    fireEvent.blur(birthDateInput);

    fireEvent.change(principalInput, { target: { value: "0" } });
    fireEvent.blur(principalInput);

    fireEvent.change(salaryInput, { target: { value: "0" } });
    fireEvent.blur(salaryInput);

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/tanggal lahir wajib diisi/i)).toBeDefined();
      expect(screen.getByText(/plafon kredit harus lebih besar dari rp 0/i)).toBeDefined();
      expect(screen.getByText(/gaji bersih harus lebih besar dari rp 0/i)).toBeDefined();
      expect(mockOnCalculate).not.toHaveBeenCalled();
    });
  });

  it("should validate applicant age bounds (minimum 20 years, maximum before 85 years)", async () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} />);

    const birthDateInput = screen.getByLabelText(/tanggal lahir/i);
    const form = screen.getByTestId("calculator-form");

    // Underage (< 20 years, e.g. born 2015)
    fireEvent.change(birthDateInput, { target: { value: "2015-05-10" } });
    fireEvent.blur(birthDateInput);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/kurang dari batas minimum 20 tahun/i)).toBeDefined();
      expect(mockOnCalculate).not.toHaveBeenCalled();
    });

    // Overage (>= 85 years, e.g. born 1930)
    fireEvent.change(birthDateInput, { target: { value: "1930-01-01" } });
    fireEvent.blur(birthDateInput);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/melebihi batas usia maksimal sebelum 85 tahun/i)).toBeDefined();
      expect(mockOnCalculate).not.toHaveBeenCalled();
    });
  });

  it("should display computed age badge dynamically", async () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} initialValues={{ birthDate: "1975-01-01" }} />);

    expect(screen.getByText(/usia:/i)).toBeDefined();
  });

  it("should validate tenor bounds (1 to 360 months)", async () => {
    render(<CalculatorForm onCalculate={mockOnCalculate} />);

    const tenorInput = screen.getByLabelText(/tenor pinjaman/i);
    const form = screen.getByTestId("calculator-form");

    // Tenor 0 or invalid
    fireEvent.change(tenorInput, { target: { value: "0" } });
    fireEvent.blur(tenorInput);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/tenor pinjaman minimal 1 bulan/i)).toBeDefined();
      expect(mockOnCalculate).not.toHaveBeenCalled();
    });

    // Tenor > 360
    fireEvent.change(tenorInput, { target: { value: "400" } });
    fireEvent.blur(tenorInput);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/tenor pinjaman maksimal 360 bulan/i)).toBeDefined();
      expect(mockOnCalculate).not.toHaveBeenCalled();
    });
  });
});
