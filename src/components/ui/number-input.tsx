"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  error?: string;
  label?: string;
  helperText?: string;
  allowDecimals?: boolean;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  prefix,
  error,
  label,
  helperText,
  id,
  className,
  disabled,
  placeholder = "0",
  allowDecimals = false,
  ...props
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    value !== undefined && value !== null ? String(value) : ""
  );

  useEffect(() => {
    setDisplayValue(value !== undefined && value !== null ? String(value) : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const filtered = allowDecimals
      ? raw.replace(/[^\d.]/g, "")
      : raw.replace(/[^\d]/g, "");
    setDisplayValue(filtered);

    const num = allowDecimals ? parseFloat(filtered) : parseInt(filtered, 10);
    onChange(isNaN(num) ? 0 : num);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let num = allowDecimals ? parseFloat(displayValue) : parseInt(displayValue, 10);
    if (isNaN(num)) num = 0;

    onChange(num);
    setDisplayValue(String(num));
    if (props.onBlur) props.onBlur(e);
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
          inputMode={allowDecimals ? "decimal" : "numeric"}
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "block w-full rounded-lg border py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-1",
            prefix ? "pl-9" : "pl-3",
            suffix ? "pr-10" : "pr-3",
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
