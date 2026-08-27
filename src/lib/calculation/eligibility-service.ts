import {
  Money,
  Percentage,
  Tenor,
  AgeDetail,
} from "@/lib/domain";
import { calculateAgeBreakdown, AgeCalculationBreakdown } from "./calculation-input-validator";

export interface EligibilityEvaluationInput {
  birthDate: Date;
  calculationDate?: Date;
  requestedPrincipal: Money | number | string;
  requestedTenor: Tenor | number;
  monthlySalary: Money | number | string;
  monthlyInstallment: Money | number | string;
  maxDbr?: Percentage | number | string;
  maxProductTenorMonths?: number;
  maxProductPrincipal?: Money | number | string;
  maxPrincipalCapacity: Money | number | string;
  netDisbursement: Money | number | string;
  maxEffectiveAgeYears?: number;
  maxEffectiveAgeMonths?: number;
}

export interface EligibilityEvaluationResult {
  status: "OK" | "OVER";
  isEligible: boolean;
  reasons: string[];
  warnings: string[];
  ageAtCalculation: AgeCalculationBreakdown;
  ageAtMaturity: AgeDetail;
  maxEffectiveAge: AgeDetail;
  maxTenorAge: Tenor;
  maxTenorProduct: Tenor;
  maxTenorFinal: Tenor;
  dbr: Percentage;
  maxDbr: Percentage;
  monthlySalary: Money;
  monthlyInstallment: Money;
  remainingSalary: Money;
  requestedPrincipal: Money;
  maxPrincipalCapacity: Money;
  maxProductPrincipal: Money;
  maxPrincipalFinal: Money;
  netDisbursement: Money;
}

export class EligibilityService {
  /**
   * Evaluates complete credit eligibility across all business rules:
   * 1. DBR <= Max DBR (90%)
   * 2. Age at maturity < Effective Max Age (84y 11m / before 85 years)
   * 3. Tenor <= Final Max Tenor (MIN(MaxTenorProduct, MaxTenorAge))
   * 4. Principal <= Final Max Principal (MIN(MaxPrincipalCapacity, MaxProductPrincipal))
   * 5. Net Disbursement > 0
   *
   * Aggregates all reasons without early stopping per BUSINESS_RULES.md Section 38-41.
   */
  static evaluate(
    input: EligibilityEvaluationInput
  ): EligibilityEvaluationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];

    const calcDate = input.calculationDate || new Date();
    const birthDate = input.birthDate;

    const requestedPrincipal = Money.from(input.requestedPrincipal);
    const requestedTenor = Tenor.fromMonths(input.requestedTenor);
    const monthlySalary = Money.from(input.monthlySalary);
    const monthlyInstallment = Money.from(input.monthlyInstallment);
    const maxDbr = input.maxDbr
      ? Percentage.fromDecimal(input.maxDbr)
      : Percentage.fromDecimal(0.90);
    const maxProductTenorMonths = input.maxProductTenorMonths ?? 120;
    const maxProductPrincipal = input.maxProductPrincipal
      ? Money.from(input.maxProductPrincipal)
      : Money.from(200000000);
    const maxPrincipalCapacity = Money.from(input.maxPrincipalCapacity);
    const netDisbursement = Money.from(input.netDisbursement);

    // Max effective age boundary: strictly before 85 years (84y 11m per Section 7.4)
    const maxEffectiveAge: AgeDetail = {
      years: input.maxEffectiveAgeYears ?? 84,
      months: input.maxEffectiveAgeMonths ?? 11,
    };
    const maxEffectiveTotalMonths = maxEffectiveAge.years * 12 + maxEffectiveAge.months;

    // 1. Calculate Age at Calculation Date
    const ageAtCalculation = calculateAgeBreakdown(birthDate, calcDate);

    // 2. Calculate Maturity Date and Age at Maturity Date
    const maturityDate = new Date(calcDate);
    maturityDate.setMonth(maturityDate.getMonth() + requestedTenor.months);
    const maturityAgeBreakdown = calculateAgeBreakdown(birthDate, maturityDate);
    const ageAtMaturity: AgeDetail = {
      years: maturityAgeBreakdown.years,
      months: maturityAgeBreakdown.months,
      days: maturityAgeBreakdown.days,
    };
    const maturityTotalMonths = maturityAgeBreakdown.totalMonths;

    // 3. Tenor Calculations: Max Tenor by Age vs Max Tenor by Product
    // Max Tenor by Age = Remaining months until effective max age
    const remainingMonthsUntilMaxAge = Math.max(0, maxEffectiveTotalMonths - ageAtCalculation.totalMonths);
    const maxTenorAge = Tenor.fromMonths(remainingMonthsUntilMaxAge);
    const maxTenorProduct = Tenor.fromMonths(maxProductTenorMonths);
    const maxTenorFinal = maxTenorAge.lessThan(maxTenorProduct) ? maxTenorAge : maxTenorProduct;

    // 4. Principal Calculations: Max Principal Capacity vs Product Limit
    const maxPrincipalFinal = maxPrincipalCapacity.lessThan(maxProductPrincipal)
      ? maxPrincipalCapacity
      : maxProductPrincipal;

    // 5. DBR Calculation & Remaining Salary
    let dbr: Percentage;
    if (monthlySalary.isZero() || monthlySalary.isNegative()) {
      dbr = Percentage.fromPercent(100);
      reasons.push("Gaji bersih debitur harus lebih besar dari Rp 0.");
    } else {
      const dbrDecimal = monthlyInstallment.amount.dividedBy(monthlySalary.amount);
      dbr = Percentage.fromDecimal(dbrDecimal);
    }
    const remainingSalary = monthlySalary.subtract(monthlyInstallment);

    // -------------------------------------------------------------------------
    // Rule Evaluation (Collect all reasons without stopping early)
    // -------------------------------------------------------------------------

    // Rule 1: DBR Check (Exact unrounded decimal <= 90%)
    if (dbr.greaterThan(maxDbr)) {
      reasons.push(
        `DBR (${dbr.format(2)}) melebihi batas maksimum yang diperbolehkan (${maxDbr.format(2)}).`
      );
    }

    // Rule 2: Age at Maturity Check (< 85 years)
    if (maturityTotalMonths > maxEffectiveTotalMonths) {
      reasons.push(
        `Usia debitur saat lunas (${ageAtMaturity.years} tahun ${ageAtMaturity.months} bulan) melampaui batas usia maksimum (${maxEffectiveAge.years} tahun ${maxEffectiveAge.months} bulan).`
      );
    }

    // Rule 3: Tenor Check
    if (requestedTenor.greaterThan(maxTenorFinal)) {
      reasons.push(
        `Tenor pengajuan (${requestedTenor.months} bulan) melebihi batas tenor maksimal yang diizinkan (${maxTenorFinal.months} bulan).`
      );
    }

    // Rule 4: Principal Check
    if (requestedPrincipal.greaterThan(maxPrincipalFinal)) {
      reasons.push(
        `Plafon pengajuan (${requestedPrincipal.format()}) melebihi batas maksimal plafon yang diizinkan (${maxPrincipalFinal.format()}).`
      );
    }

    // Rule 5: Net Disbursement Check
    if (netDisbursement.isNegative() || netDisbursement.isZero()) {
      reasons.push(
        `Terima bersih (${netDisbursement.format()}) bernilai nol atau negatif setelah dikurangi seluruh biaya dan potongan.`
      );
    }

    const isEligible = reasons.length === 0;
    const status: "OK" | "OVER" = isEligible ? "OK" : "OVER";

    return {
      status,
      isEligible,
      reasons,
      warnings,
      ageAtCalculation,
      ageAtMaturity,
      maxEffectiveAge,
      maxTenorAge,
      maxTenorProduct,
      maxTenorFinal,
      dbr,
      maxDbr,
      monthlySalary,
      monthlyInstallment,
      remainingSalary,
      requestedPrincipal,
      maxPrincipalCapacity,
      maxProductPrincipal,
      maxPrincipalFinal,
      netDisbursement,
    };
  }
}
