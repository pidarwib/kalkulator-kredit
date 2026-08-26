import * as XLSX from "xlsx";
import * as crypto from "crypto";
import * as fs from "fs";

export interface ParsedBpr {
  code: string;
  name: string;
  status: string;
}

export interface ParsedProduct {
  code: string;
  name: string;
  bprCode: string;
  description: string;
  status: string;
}

export interface ParsedCreditParameter {
  productCode: string;
  maximumAgeYears: number;
  maximumAgeMonths: number;
  maximumTenorMonths: number;
  maximumPrincipal: number;
  maximumDbr: number;
  flatAnnualRate: number;
  flatMonthlyRate: number;
  principalRoundingIncrement: number;
  installmentDeductionPeriods: number;
  version: string;
}

export interface ParsedFeeParameter {
  productCode: string;
  adminRate: number;
  provisionRate: number;
  verificationFee: number;
  flaggingFee: number;
  frontingRate: number;
  reserveRate: number;
  version: string;
}

export interface ParsedPaymentOffice {
  code: string;
  name: string;
  bprCode: string;
  type: string;
  status: string;
}

export interface ParsedInsuranceRate {
  productCode: string;
  age: number;
  tenorYears: number;
  premiumRate: number;
  version: string;
}

export interface ParsedWorkbookData {
  documentHash: string;
  bprs: ParsedBpr[];
  products: ParsedProduct[];
  creditParameters: ParsedCreditParameter[];
  feeParameters: ParsedFeeParameter[];
  paymentOffices: ParsedPaymentOffice[];
  insuranceRates: ParsedInsuranceRate[];
}

export function parseExcelWorkbook(filePath: string): ParsedWorkbookData {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const documentHash = crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");

  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const requiredSheets = ["Ref", "Asuransi", "Simulasi BPR"];

  for (const requiredSheet of requiredSheets) {
    if (!workbook.SheetNames.includes(requiredSheet)) {
      throw new Error(
        `Invalid workbook structure: Missing required sheet "${requiredSheet}". Found: [${workbook.SheetNames.join(
          ", "
        )}]`
      );
    }
  }

  // 1. Parse BPR & Products from Ref sheet
  const refSheet = workbook.Sheets["Ref"];
  const refRows: any[][] = XLSX.utils.sheet_to_json(refSheet, { header: 1 });

  const bprs: ParsedBpr[] = [
    {
      code: "BPR_KOTA_MADIUN",
      name: "BPR Kota Madiun",
      status: "ACTIVE",
    },
    {
      code: "BPR_BHAKTI_SUMEKAR",
      name: "BPR Bhakti Sumekar",
      status: "ACTIVE",
    },
  ];

  const products: ParsedProduct[] = [
    {
      code: "PLATINUM_MADIUN",
      name: "Kredit Pensiun Platinum BPR Kota",
      bprCode: "BPR_KOTA_MADIUN",
      description: "Produk pinjaman pensiunan bunga tetap dengan asuransi jiwa kredit",
      status: "ACTIVE",
    },
  ];

  // 2. Parse Credit Parameters (10.8% p.a. / 0.9% p.m., DBR 90%, Tenor 120, Plafon 200jt)
  const creditParameters: ParsedCreditParameter[] = [
    {
      productCode: "PLATINUM_MADIUN",
      maximumAgeYears: 75,
      maximumAgeMonths: 0,
      maximumTenorMonths: 120,
      maximumPrincipal: 200000000,
      maximumDbr: 0.9,
      flatAnnualRate: 0.108,
      flatMonthlyRate: 0.009,
      principalRoundingIncrement: 100000,
      installmentDeductionPeriods: 2,
      version: "v1.0",
    },
  ];

  // 3. Parse Fee Parameters (Admin 0.5%, Provisi 0.5%, Verifikasi 1.5jt, Flagging 38rb, Fronting 6%, Cadangan 21.5%)
  const feeParameters: ParsedFeeParameter[] = [
    {
      productCode: "PLATINUM_MADIUN",
      adminRate: 0.005,
      provisionRate: 0.005,
      verificationFee: 1500000,
      flaggingFee: 38000,
      frontingRate: 0.06,
      reserveRate: 0.215,
      version: "v1.0",
    },
  ];

  // 4. Parse Payment Offices from Ref sheet columns 20-22
  const paymentOffices: ParsedPaymentOffice[] = [];
  const seenOffices = new Set<string>();

  for (let r = 1; r < refRows.length; r++) {
    const row = refRows[r];
    if (!row) continue;
    const region = row[20];
    const city = row[21];

    if (city && typeof city === "string" && city.trim().length > 0) {
      const trimmedCity = city.trim().toUpperCase();
      const code = `POS_${trimmedCity.replace(/[^A-Z0-9]/g, "_")}`;

      if (!seenOffices.has(code)) {
        seenOffices.add(code);
        paymentOffices.push({
          code,
          name: `Kantor Pos ${trimmedCity}${region ? ` (${region})` : ""}`,
          bprCode: "BPR_KOTA_MADIUN",
          type: "POS",
          status: "ACTIVE",
        });
      }
    }
  }

  // 5. Parse Insurance Rates matrix from Asuransi sheet
  const asuransiSheet = workbook.Sheets["Asuransi"];
  const asuransiRows: any[][] = XLSX.utils.sheet_to_json(asuransiSheet, {
    header: 1,
  });

  const insuranceRates: ParsedInsuranceRate[] = [];
  const seenRates = new Set<string>();

  // Find the header row starting with MASUK
  let tableStartRow = -1;
  for (let r = 0; r < Math.min(10, asuransiRows.length); r++) {
    if (asuransiRows[r]?.[0] === "MASUK") {
      tableStartRow = r;
      break;
    }
  }

  if (tableStartRow === -1) {
    throw new Error(
      "Invalid Asuransi sheet structure: Could not find header row with 'MASUK'"
    );
  }

  // Tenor headers are columns 1 to 15 (representing 1 to 15 years)
  for (let r = tableStartRow + 2; r < asuransiRows.length; r++) {
    const row = asuransiRows[r];
    if (!row) continue;
    const age = row[0];

    // If age is a valid integer between 50 and 95
    if (typeof age === "number" && age >= 50 && age <= 95) {
      for (let tenorYear = 1; tenorYear <= 15; tenorYear++) {
        const rateVal = row[tenorYear];
        if (typeof rateVal === "number" && !isNaN(rateVal) && rateVal >= 0) {
          const key = `${age}_${tenorYear}`;
          if (!seenRates.has(key)) {
            seenRates.add(key);
            insuranceRates.push({
              productCode: "PLATINUM_MADIUN",
              age,
              tenorYears: tenorYear,
              premiumRate: rateVal,
              version: "v1.0",
            });
          }
        }
      }
    }
  }

  return {
    documentHash,
    bprs,
    products,
    creditParameters,
    feeParameters,
    paymentOffices,
    insuranceRates,
  };
}
