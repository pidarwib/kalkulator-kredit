import * as fs from "fs";
import * as path from "path";
import { parseExcelWorkbook, ParsedWorkbookData } from "./excel-parser";
import { validateReferenceData, ValidationReport } from "./reference-validator";

export interface PipelineResult {
  success: boolean;
  documentHash: string;
  report: ValidationReport;
  exportedFiles: string[];
}

export function runReferenceDataPipeline(
  excelFilePath?: string
): PipelineResult {
  const rootDir = process.cwd();
  const sourcePath =
    excelFilePath ||
    path.resolve(rootDir, "reference_source/original/KALKULATOR KREDIT.xlsx");
  const validatedDir = path.resolve(rootDir, "reference_source/validated");
  const importDir = path.resolve(rootDir, "reference_source/import");

  // Ensure output directories exist
  if (!fs.existsSync(validatedDir)) {
    fs.mkdirSync(validatedDir, { recursive: true });
  }
  if (!fs.existsSync(importDir)) {
    fs.mkdirSync(importDir, { recursive: true });
  }

  // 1. Parse Excel workbook
  const parsedData: ParsedWorkbookData = parseExcelWorkbook(sourcePath);

  // 2. Validate Data
  const report: ValidationReport = validateReferenceData(parsedData);

  if (!report.isValid) {
    return {
      success: false,
      documentHash: parsedData.documentHash,
      report,
      exportedFiles: [],
    };
  }

  // 3. Save copy to validated/
  const validatedTarget = path.join(validatedDir, "KALKULATOR_VALIDATED.xlsx");
  fs.copyFileSync(sourcePath, validatedTarget);

  // 4. Export seed-ready JSON files to import/
  const exportedFiles: string[] = [];

  const exports = [
    {
      file: "bpr_master.json",
      data: parsedData.bprs,
    },
    {
      file: "products.json",
      data: parsedData.products,
    },
    {
      file: "credit_parameters.json",
      data: parsedData.creditParameters,
    },
    {
      file: "fee_parameters.json",
      data: parsedData.feeParameters,
    },
    {
      file: "payment_offices.json",
      data: parsedData.paymentOffices,
    },
    {
      file: "insurance_rates.json",
      data: parsedData.insuranceRates,
    },
    {
      file: "manifest.json",
      data: {
        sourceFileName: path.basename(sourcePath),
        documentHash: parsedData.documentHash,
        pipelineVersion: "1.0.0",
        extractedAt: new Date().toISOString(),
        validationStatus: "APPROVED",
        stats: report.stats,
      },
    },
  ];

  for (const item of exports) {
    const targetPath = path.join(importDir, item.file);
    fs.writeFileSync(targetPath, JSON.stringify(item.data, null, 2), "utf-8");
    exportedFiles.push(item.file);
  }

  return {
    success: true,
    documentHash: parsedData.documentHash,
    report,
    exportedFiles,
  };
}
