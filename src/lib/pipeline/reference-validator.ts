import { ParsedWorkbookData } from "./excel-parser";

export interface ValidationError {
  entity: string;
  field: string;
  message: string;
  value?: any;
}

export interface ValidationReport {
  isValid: boolean;
  documentHash: string;
  validatedAt: string;
  stats: {
    bprCount: number;
    productCount: number;
    creditParameterCount: number;
    feeParameterCount: number;
    paymentOfficeCount: number;
    insuranceRateCount: number;
  };
  errors: ValidationError[];
  warnings: string[];
}

export function validateReferenceData(
  data: ParsedWorkbookData
): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // 1. Validate BPRs
  const bprCodes = new Set<string>();
  for (const bpr of data.bprs) {
    if (!bpr.code || bpr.code.trim().length === 0) {
      errors.push({
        entity: "BPR",
        field: "code",
        message: "BPR code cannot be empty",
      });
    } else if (bprCodes.has(bpr.code)) {
      errors.push({
        entity: "BPR",
        field: "code",
        message: `Duplicate BPR code: ${bpr.code}`,
        value: bpr.code,
      });
    } else {
      bprCodes.add(bpr.code);
    }

    if (!bpr.name || bpr.name.trim().length === 0) {
      errors.push({
        entity: "BPR",
        field: "name",
        message: "BPR name cannot be empty",
      });
    }
  }

  // 2. Validate Products
  const productCodes = new Set<string>();
  for (const product of data.products) {
    if (!product.code || product.code.trim().length === 0) {
      errors.push({
        entity: "Product",
        field: "code",
        message: "Product code cannot be empty",
      });
    } else if (productCodes.has(product.code)) {
      errors.push({
        entity: "Product",
        field: "code",
        message: `Duplicate Product code: ${product.code}`,
        value: product.code,
      });
    } else {
      productCodes.add(product.code);
    }

    if (!bprCodes.has(product.bprCode)) {
      errors.push({
        entity: "Product",
        field: "bprCode",
        message: `Product references unknown BPR: ${product.bprCode}`,
        value: product.bprCode,
      });
    }
  }

  // 3. Validate Credit Parameters
  for (const param of data.creditParameters) {
    if (!productCodes.has(param.productCode)) {
      errors.push({
        entity: "CreditParameter",
        field: "productCode",
        message: `Credit parameter references unknown product: ${param.productCode}`,
        value: param.productCode,
      });
    }

    if (param.flatAnnualRate <= 0 || param.flatAnnualRate > 1) {
      errors.push({
        entity: "CreditParameter",
        field: "flatAnnualRate",
        message: `Invalid annual rate: ${param.flatAnnualRate}. Must be between 0 and 1.`,
        value: param.flatAnnualRate,
      });
    }

    if (param.maximumDbr <= 0 || param.maximumDbr > 1) {
      errors.push({
        entity: "CreditParameter",
        field: "maximumDbr",
        message: `Invalid maximum DBR: ${param.maximumDbr}. Must be between 0 and 1.`,
        value: param.maximumDbr,
      });
    }

    if (param.maximumTenorMonths <= 0 || param.maximumTenorMonths > 360) {
      errors.push({
        entity: "CreditParameter",
        field: "maximumTenorMonths",
        message: `Invalid maximum tenor: ${param.maximumTenorMonths}. Must be between 1 and 360.`,
        value: param.maximumTenorMonths,
      });
    }

    if (param.maximumPrincipal <= 0) {
      errors.push({
        entity: "CreditParameter",
        field: "maximumPrincipal",
        message: `Invalid maximum principal: ${param.maximumPrincipal}. Must be greater than 0.`,
        value: param.maximumPrincipal,
      });
    }
  }

  // 4. Validate Fee Parameters
  for (const fee of data.feeParameters) {
    if (!productCodes.has(fee.productCode)) {
      errors.push({
        entity: "FeeParameter",
        field: "productCode",
        message: `Fee parameter references unknown product: ${fee.productCode}`,
        value: fee.productCode,
      });
    }

    if (fee.adminRate < 0 || fee.adminRate > 1) {
      errors.push({
        entity: "FeeParameter",
        field: "adminRate",
        message: `Invalid admin rate: ${fee.adminRate}`,
        value: fee.adminRate,
      });
    }

    if (fee.flaggingFee < 0) {
      errors.push({
        entity: "FeeParameter",
        field: "flaggingFee",
        message: `Invalid flagging fee: ${fee.flaggingFee}`,
        value: fee.flaggingFee,
      });
    }
  }

  // 5. Validate Insurance Rates
  const rateKeys = new Set<string>();
  for (const rate of data.insuranceRates) {
    if (!productCodes.has(rate.productCode)) {
      errors.push({
        entity: "InsuranceRate",
        field: "productCode",
        message: `Insurance rate references unknown product: ${rate.productCode}`,
        value: rate.productCode,
      });
    }

    const key = `${rate.productCode}_${rate.age}_${rate.tenorYears}`;
    if (rateKeys.has(key)) {
      errors.push({
        entity: "InsuranceRate",
        field: "compositeKey",
        message: `Duplicate insurance rate entry: Age ${rate.age}, Tenor ${rate.tenorYears}`,
        value: key,
      });
    } else {
      rateKeys.add(key);
    }

    if (rate.premiumRate < 0 || rate.premiumRate > 1 || isNaN(rate.premiumRate)) {
      errors.push({
        entity: "InsuranceRate",
        field: "premiumRate",
        message: `Invalid premium rate for age ${rate.age} tenor ${rate.tenorYears}: ${rate.premiumRate}`,
        value: rate.premiumRate,
      });
    }

    if (rate.age < 18 || rate.age > 100) {
      errors.push({
        entity: "InsuranceRate",
        field: "age",
        message: `Out-of-range age in insurance table: ${rate.age}`,
        value: rate.age,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    documentHash: data.documentHash,
    validatedAt: new Date().toISOString(),
    stats: {
      bprCount: data.bprs.length,
      productCount: data.products.length,
      creditParameterCount: data.creditParameters.length,
      feeParameterCount: data.feeParameters.length,
      paymentOfficeCount: data.paymentOffices.length,
      insuranceRateCount: data.insuranceRates.length,
    },
    errors,
    warnings,
  };
}
