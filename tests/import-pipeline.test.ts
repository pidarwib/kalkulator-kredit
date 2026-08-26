import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  parseExcelWorkbook,
  validateReferenceData,
  runReferenceDataPipeline,
  ParsedWorkbookData,
} from "@/lib/pipeline";

describe("TASK-008: Reference Data Import Pipeline", () => {
  const excelPath = path.resolve(
    process.cwd(),
    "reference_source/original/KALKULATOR KREDIT.xlsx"
  );

  describe("Excel Parser", () => {
    it("should parse sheets from the official workbook without errors", () => {
      const data = parseExcelWorkbook(excelPath);

      expect(data.documentHash).toBeDefined();
      expect(data.documentHash.length).toBe(64); // SHA256 length
      expect(data.bprs.length).toBeGreaterThan(0);
      expect(data.products.length).toBeGreaterThan(0);
      expect(data.creditParameters.length).toBeGreaterThan(0);
      expect(data.feeParameters.length).toBeGreaterThan(0);
      expect(data.paymentOffices.length).toBeGreaterThan(0);
      expect(data.insuranceRates.length).toBe(300); // 20 ages x 15 tenors
    });

    it("should throw error if required sheets are missing", () => {
      expect(() =>
        parseExcelWorkbook(path.resolve(process.cwd(), "nonexistent.xlsx"))
      ).toThrow("File not found");
    });
  });

  describe("Reference Validator Engine", () => {
    it("should validate clean parsed workbook data as valid", () => {
      const data = parseExcelWorkbook(excelPath);
      const report = validateReferenceData(data);

      expect(report.isValid).toBe(true);
      expect(report.errors.length).toBe(0);
      expect(report.stats.insuranceRateCount).toBe(300);
      expect(report.stats.bprCount).toBe(2);
    });

    it("should reject duplicate insurance rate keys", () => {
      const data = parseExcelWorkbook(excelPath);
      // Inject duplicate
      const duplicatedData: ParsedWorkbookData = {
        ...data,
        insuranceRates: [
          ...data.insuranceRates,
          {
            productCode: "PLATINUM_MADIUN",
            age: 65,
            tenorYears: 1,
            premiumRate: 0.0049,
            version: "v1.0",
          },
        ],
      };

      const report = validateReferenceData(duplicatedData);
      expect(report.isValid).toBe(false);
      expect(
        report.errors.some((e) => e.message.includes("Duplicate insurance rate"))
      ).toBe(true);
    });

    it("should reject invalid rates outside range [0, 1]", () => {
      const data = parseExcelWorkbook(excelPath);
      const invalidRateData: ParsedWorkbookData = {
        ...data,
        creditParameters: [
          {
            ...data.creditParameters[0],
            flatAnnualRate: 1.5, // invalid: 150%
          },
        ],
      };

      const report = validateReferenceData(invalidRateData);
      expect(report.isValid).toBe(false);
      expect(
        report.errors.some((e) => e.message.includes("Invalid annual rate"))
      ).toBe(true);
    });

    it("should reject references to unknown products", () => {
      const data = parseExcelWorkbook(excelPath);
      const orphanData: ParsedWorkbookData = {
        ...data,
        creditParameters: [
          {
            ...data.creditParameters[0],
            productCode: "UNKNOWN_PRODUCT",
          },
        ],
      };

      const report = validateReferenceData(orphanData);
      expect(report.isValid).toBe(false);
      expect(
        report.errors.some((e) =>
          e.message.includes("references unknown product")
        )
      ).toBe(true);
    });
  });

  describe("End-to-End Pipeline Execution", () => {
    it("should run pipeline, copy validated file, and export seed-ready JSON artifacts with manifest", () => {
      const result = runReferenceDataPipeline(excelPath);

      expect(result.success).toBe(true);
      expect(result.exportedFiles).toContain("manifest.json");
      expect(result.exportedFiles).toContain("insurance_rates.json");
      expect(result.exportedFiles).toContain("credit_parameters.json");
      expect(result.exportedFiles).toContain("fee_parameters.json");

      // Verify files physically exist on disk
      const importDir = path.resolve(process.cwd(), "reference_source/import");
      const manifestPath = path.join(importDir, "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(manifest.documentHash).toBe(result.documentHash);
      expect(manifest.validationStatus).toBe("APPROVED");
      expect(manifest.stats.insuranceRateCount).toBe(300);
    });
  });
});
