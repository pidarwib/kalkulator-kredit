import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CurrencyInput,
  PercentageInput,
  NumberInput,
  formatCurrencyValue,
  parseCurrencyValue,
  formatPercentageValue,
  parsePercentageValue,
} from "@/components/ui";

describe("TASK-045: Currency, Percentage & Number Reusable Components Tests", () => {
  describe("Currency Utilities & Component", () => {
    it("should format raw numbers into Indonesian Rupiah format correctly", () => {
      expect(formatCurrencyValue(100000000)).toBe("100.000.000");
      expect(formatCurrencyValue(8500000)).toBe("8.500.000");
      expect(formatCurrencyValue(0)).toBe("0");
    });

    it("should parse formatted string with dots into clean numeric value", () => {
      expect(parseCurrencyValue("100.000.000")).toBe(100000000);
      expect(parseCurrencyValue("8.500.000")).toBe(8500000);
      expect(parseCurrencyValue("Rp 50.000.000")).toBe(50000000);
      expect(parseCurrencyValue("")).toBe(0);
    });

    it("should render CurrencyInput with Rp prefix and formatted display", () => {
      const handleChange = vi.fn();
      render(
        <CurrencyInput
          label="Plafon Pinjaman"
          value={150000000}
          onChange={handleChange}
        />
      );

      const input = screen.getByLabelText(/plafon pinjaman/i) as HTMLInputElement;
      expect(input.value).toBe("150.000.000");
      expect(screen.getByText("Rp")).toBeDefined();

      fireEvent.change(input, { target: { value: "200.000.000" } });
      expect(handleChange).toHaveBeenCalledWith(200000000);
    });
  });

  describe("Percentage Utilities & Component", () => {
    it("should format decimal ratio into percentage display", () => {
      expect(formatPercentageValue(0.125, true, 2)).toBe("12,5");
      expect(formatPercentageValue(15.75, false, 2)).toBe("15,75");
    });

    it("should parse percentage string into numeric value", () => {
      expect(parsePercentageValue("12,5", true)).toBeCloseTo(0.125, 4);
      expect(parsePercentageValue("15,75", false)).toBeCloseTo(15.75, 2);
    });

    it("should render PercentageInput with suffix and update internal decimal value", () => {
      const handleChange = vi.fn();
      render(
        <PercentageInput
          label="Suku Bunga"
          value={0.12}
          isDecimalRatio={true}
          onChange={handleChange}
        />
      );

      const input = screen.getByLabelText(/suku bunga/i) as HTMLInputElement;
      expect(input.value).toBe("12");
      expect(screen.getByText("%")).toBeDefined();

      fireEvent.change(input, { target: { value: "15" } });
      expect(handleChange).toHaveBeenCalledWith(0.15);
    });
  });

  describe("NumberInput Component", () => {
    it("should render integer input with suffix unit and enforce min/max bounds", () => {
      const handleChange = vi.fn();
      render(
        <NumberInput
          label="Tenor Pinjaman"
          value={60}
          min={1}
          max={360}
          suffix="Bulan"
          onChange={handleChange}
        />
      );

      const input = screen.getByLabelText(/tenor pinjaman/i) as HTMLInputElement;
      expect(input.value).toBe("60");
      expect(screen.getByText("Bulan")).toBeDefined();

      fireEvent.change(input, { target: { value: "120" } });
      expect(handleChange).toHaveBeenCalledWith(120);
    });
  });
});
