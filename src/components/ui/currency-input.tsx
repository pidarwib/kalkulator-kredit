"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
  error?: string;
  label?: string;
  helperText?: string;
}

/**
 * Format a number to Indonesian Rupiah thousands format (e.g. 1000000 -> "1.000.000")
 */
export function formatCurrencyValue(val: number | null | undefined, allowDecimals = false): string {
  if (val === undefined || val === null || isNaN(val)) {
    return "";
  }
  if (val === 0) {
    return "0";
  }

  if (allowDecimals) {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Parse raw string input into clean numeric value
 */
export function parseCurrencyValue(str: string): number {
  if (!str) return 0;
  // Strip out any currency prefixes or letters, replace Indonesian thousand dots and commas
  const digitsAndSeparators = str.replace(/[^\d.,]/g, "");
  const clean = digitsAndSeparators.replace(/\./g, "").replace(/,/g, ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function CurrencyInput({
  value,
  onChange,
  prefix = "Rp",
  allowDecimals = false,
  min,
  max,
  error,
  label,
  helperText,
  id,
  className,
  disabled,
  placeholder = "0",
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    formatCurrencyValue(value, allowDecimals)
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrencyValue(value, allowDecimals));
    }
  }, [value, allowDecimals, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, dots, and commas
    const filtered = raw.replace(/[^\d.,]/g, "");
    setDisplayValue(filtered);

    const numeric = parseCurrencyValue(filtered);
    let finalValue = numeric;

    if (min !== undefined && finalValue < min) {
      // let user type without strictly clamping on every keystroke
    }
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }

    onChange(finalValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    let numeric = parseCurrencyValue(displayValue);

    if (min !== undefined && numeric < min) {
      numeric = min;
    }
    if (max !== undefined && numeric > max) {
      numeric = max;
    }

    onChange(numeric);
    setDisplayValue(formatCurrencyValue(numeric, allowDecimals));
    if (props.onBlur) props.onBlur(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {prefix && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-xs font-semibold text-slate-500">{prefix}</span>
          </div>
        )}
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "block w-full rounded-lg border py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-1",
            prefix ? "pl-9 pr-3" : "px-3",
            error
              ? "border-red-300 focus:border-red-600 focus:ring-red-600 bg-red-50/20 text-red-900"
              : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600 bg-white",
            disabled && "bg-slate-50 text-slate-400 cursor-not-allowed",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
      {!error && helperText && (
        <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
