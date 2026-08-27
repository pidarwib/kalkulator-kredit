"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface PercentageInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number; // e.g. 0.12 or 12 depending on isDecimalRatio
  onChange: (value: number) => void;
  isDecimalRatio?: boolean; // if true, value 0.12 displays as 12% and internal is 0.12
  suffix?: string;
  decimals?: number;
  min?: number;
  max?: number;
  error?: string;
  label?: string;
  helperText?: string;
}

export function formatPercentageValue(val: number, isDecimalRatio = false, decimals = 2): string {
  if (val === undefined || val === null || isNaN(val)) return "";
  const displayNum = isDecimalRatio ? val * 100 : val;
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(displayNum);
}

export function parsePercentageValue(str: string, isDecimalRatio = false): number {
  if (!str) return 0;
  const clean = str.replace(/\./g, "").replace(/,/g, ".");
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return isDecimalRatio ? num / 100 : num;
}

export function PercentageInput({
  value,
  onChange,
  isDecimalRatio = false,
  suffix = "%",
  decimals = 2,
  min = 0,
  max = 100,
  error,
  label,
  helperText,
  id,
  className,
  disabled,
  placeholder = "0",
  ...props
}: PercentageInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    formatPercentageValue(value, isDecimalRatio, decimals)
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatPercentageValue(value, isDecimalRatio, decimals));
    }
  }, [value, isDecimalRatio, decimals, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const filtered = raw.replace(/[^\d.,]/g, "");
    setDisplayValue(filtered);

    const parsed = parsePercentageValue(filtered, isDecimalRatio);
    onChange(parsed);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    let parsed = parsePercentageValue(displayValue, isDecimalRatio);

    const checkVal = isDecimalRatio ? parsed * 100 : parsed;
    if (min !== undefined && checkVal < min) {
      parsed = isDecimalRatio ? min / 100 : min;
    }
    if (max !== undefined && checkVal > max) {
      parsed = isDecimalRatio ? max / 100 : max;
    }

    onChange(parsed);
    setDisplayValue(formatPercentageValue(parsed, isDecimalRatio, decimals));
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
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "block w-full rounded-lg border py-2 pl-3 pr-8 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-1",
            error
              ? "border-red-300 focus:border-red-600 focus:ring-red-600 bg-red-50/20 text-red-900"
              : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600 bg-white",
            disabled && "bg-slate-50 text-slate-400 cursor-not-allowed",
            className
          )}
          {...props}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-xs font-semibold text-slate-500">{suffix}</span>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
      {!error && helperText && (
        <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
