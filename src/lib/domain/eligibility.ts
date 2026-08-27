import { Money } from "./money";
import { Percentage } from "./percentage";
import { Tenor } from "./tenor";

export type CreditStatus = "OK" | "OVER";

export interface AgeDetail {
  years: number;
  months: number;
  days?: number;
}

/**
 * Immutable Eligibility Domain Object.
 * Collects multi-criteria evaluation (DBR, Age, Tenor, Principal Capacity, Net Disbursement)
 * per BUSINESS_RULES.md Section 38-41.
 */
export class Eligibility {
  readonly status: CreditStatus;
  readonly isEligible: boolean;
  readonly reasons: string[];
  readonly warnings: string[];

  readonly dbr: Percentage;
  readonly maxDbr: Percentage;
  readonly monthlySalary: Money;
  readonly monthlyInstallment: Money;
  readonly remainingSalary: Money;

  readonly requestedPrincipal: Money;
  readonly maxPrincipalCapacity: Money;
  readonly maxPrincipalProduct: Money;
  readonly maxPrincipalFinal: Money;

  readonly requestedTenor: Tenor;
  readonly maxTenorAge: Tenor;
  readonly maxTenorProduct: Tenor;
  readonly maxTenorFinal: Tenor;

  readonly ageAtCalculation: AgeDetail;
  readonly ageAtMaturity: AgeDetail;
  readonly maxEffectiveAge: AgeDetail;
  readonly netDisbursement: Money;

  private constructor(params: {
    status: CreditStatus;
    isEligible: boolean;
    reasons: string[];
    warnings: string[];
    dbr: Percentage;
    maxDbr: Percentage;
    monthlySalary: Money;
    monthlyInstallment: Money;
    remainingSalary: Money;
    requestedPrincipal: Money;
    maxPrincipalCapacity: Money;
    maxPrincipalProduct: Money;
    maxPrincipalFinal: Money;
    requestedTenor: Tenor;
    maxTenorAge: Tenor;
    maxTenorProduct: Tenor;
    maxTenorFinal: Tenor;
    ageAtCalculation: AgeDetail;
    ageAtMaturity: AgeDetail;
    maxEffectiveAge: AgeDetail;
    netDisbursement: Money;
  }) {
    this.status = params.status;
    this.isEligible = params.isEligible;
    this.reasons = params.reasons;
    this.warnings = params.warnings;
    this.dbr = params.dbr;
    this.maxDbr = params.maxDbr;
    this.monthlySalary = params.monthlySalary;
    this.monthlyInstallment = params.monthlyInstallment;
    this.remainingSalary = params.remainingSalary;
    this.requestedPrincipal = params.requestedPrincipal;
    this.maxPrincipalCapacity = params.maxPrincipalCapacity;
    this.maxPrincipalProduct = params.maxPrincipalProduct;
    this.maxPrincipalFinal = params.maxPrincipalFinal;
    this.requestedTenor = params.requestedTenor;
    this.maxTenorAge = params.maxTenorAge;
    this.maxTenorProduct = params.maxTenorProduct;
    this.maxTenorFinal = params.maxTenorFinal;
    this.ageAtCalculation = params.ageAtCalculation;
    this.ageAtMaturity = params.ageAtMaturity;
    this.maxEffectiveAge = params.maxEffectiveAge;
    this.netDisbursement = params.netDisbursement;
  }

  /**
   * Evaluates eligibility across all business rules.
   * Collects all failed rules into the `reasons` array without early termination.
   */
  static evaluate(params: {
    monthlySalary: Money | number | string;
    monthlyInstallment: Money | number | string;
    maxDbr: Percentage | number | string;
    requestedPrincipal: Money | number | string;
    maxPrincipalCapacity: Money | number | string;
    maxPrincipalProduct: Money | number | string;
    requestedTenor: Tenor | number;
    maxTenorAge: Tenor | number;
    maxTenorProduct: Tenor | number;
    ageAtCalculation: AgeDetail;
    ageAtMaturity: AgeDetail;
    maxEffectiveAge?: AgeDetail;
    netDisbursement: Money | number | string;
  }): Eligibility {
    const reasons: string[] = [];
    const warnings: string[] = [];

    const salary = Money.from(params.monthlySalary);
    const installment = Money.from(params.monthlyInstallment);
    const maxDbr = Percentage.fromDecimal(params.maxDbr);
    const reqPrincipal = Money.from(params.requestedPrincipal);
    const maxPrinCap = Money.from(params.maxPrincipalCapacity);
    const maxPrinProd = Money.from(params.maxPrincipalProduct);
    const reqTenor = Tenor.fromMonths(params.requestedTenor);
    const maxTenAge = Tenor.fromMonths(params.maxTenorAge);
    const maxTenProd = Tenor.fromMonths(params.maxTenorProduct);
    const netDisb = Money.from(params.netDisbursement);

    // Max Principal Final = MIN(Capacity, Product)
    const maxPrincipalFinal = maxPrinCap.lessThan(maxPrinProd) ? maxPrinCap : maxPrinProd;

    // Max Tenor Final = MIN(Age, Product)
    const maxTenorFinal = maxTenAge.lessThan(maxTenProd) ? maxTenAge : maxTenProd;

    // Default maxEffectiveAge: 84 years 11 months (strictly < 85 years per BUSINESS_RULES.md Section 7.4)
    const maxEffectiveAge = params.maxEffectiveAge || { years: 84, months: 11 };

    // 1. Calculate DBR
    let dbr: Percentage;
    if (salary.isZero()) {
      dbr = Percentage.fromPercent(100);
      reasons.push("Gaji bersih tidak boleh nol.");
    } else {
      const dbrDecimal = installment.amount.dividedBy(salary.amount);
      dbr = Percentage.fromDecimal(dbrDecimal);
    }

    const remainingSalary = salary.subtract(installment);

    // Rule 1: DBR Check
    if (dbr.greaterThan(maxDbr)) {
      reasons.push(
        `DBR (${dbr.format(2)}) melebihi batas maksimum yang diperbolehkan (${maxDbr.format(2)}).`
      );
    }

    // Rule 2: Age at Maturity Check (Usia saat lunas harus < 85 tahun)
    const maturityTotalMonths = params.ageAtMaturity.years * 12 + params.ageAtMaturity.months;
    const maxEffectiveTotalMonths = maxEffectiveAge.years * 12 + maxEffectiveAge.months;

    if (maturityTotalMonths > maxEffectiveTotalMonths) {
      reasons.push(
        `Usia debitur saat lunas (${params.ageAtMaturity.years} tahun ${params.ageAtMaturity.months} bulan) melampaui batas usia maksimum (${maxEffectiveAge.years} tahun ${maxEffectiveAge.months} bulan).`
      );
    }

    // Rule 3: Tenor Check
    if (reqTenor.greaterThan(maxTenorFinal)) {
      reasons.push(
        `Tenor pengajuan (${reqTenor.months} bulan) melebihi batas tenor maksimal yang diizinkan (${maxTenorFinal.months} bulan).`
      );
    }

    // Rule 4: Principal Check
    if (reqPrincipal.greaterThan(maxPrincipalFinal)) {
      reasons.push(
        `Plafon pengajuan (${reqPrincipal.format()}) melebihi batas maksimal plafon (${maxPrincipalFinal.format()}).`
      );
    }

    // Rule 5: Net Disbursement Check
    if (netDisb.isNegative() || netDisb.isZero()) {
      reasons.push(
        `Terima bersih (${netDisb.format()}) bernilai nol atau negatif setelah dikurangi seluruh biaya dan potongan.`
      );
    }

    const isEligible = reasons.length === 0;
    const status: CreditStatus = isEligible ? "OK" : "OVER";

    return new Eligibility({
      status,
      isEligible,
      reasons,
      warnings,
      dbr,
      maxDbr,
      monthlySalary: salary,
      monthlyInstallment: installment,
      remainingSalary,
      requestedPrincipal: reqPrincipal,
      maxPrincipalCapacity: maxPrinCap,
      maxPrincipalProduct: maxPrinProd,
      maxPrincipalFinal,
      requestedTenor: reqTenor,
      maxTenorAge: maxTenAge,
      maxTenorProduct: maxTenProd,
      maxTenorFinal,
      ageAtCalculation: params.ageAtCalculation,
      ageAtMaturity: params.ageAtMaturity,
      maxEffectiveAge,
      netDisbursement: netDisb,
    });
  }
}
