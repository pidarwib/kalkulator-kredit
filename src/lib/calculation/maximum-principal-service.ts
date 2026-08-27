import {
  Money,
  Percentage,
  Tenor,
  CalculationMethod,
} from "@/lib/domain";
import { calculateAgeBreakdown } from "./calculation-input-validator";
import { FlatCalculationStrategy } from "./flat-calculation-strategy";
import { AnnuityCalculationStrategy } from "./annuity-calculation-strategy";

export interface MaximumPrincipalInput {
  monthlySalary: Money | number | string;
  birthDate: Date;
  calculationDate?: Date;
  method?: CalculationMethod | string;
  requestedTenorMonths?: number;
  annualMarginRate?: Percentage | number | string;
  maxDbr?: Percentage | number | string;
  maxProductTenorMonths?: number;
  maxProductPrincipal?: Money | number | string;
  principalRoundingIncrement?: Money | number | string;
  requestedPrincipal?: Money | number | string;
  maxEffectiveAgeYears?: number;
  maxEffectiveAgeMonths?: number;
}

export interface MaximumPrincipalResult {
  method: CalculationMethod;
  monthlySalary: Money;
  maxDbr: Percentage;
  maxInstallment: Money;
  ageAtCalculationYears: number;
  ageAtCalculationMonths: number;
  maxEffectiveAgeYears: number;
  maxEffectiveAgeMonths: number;
  maxTenorAgeMonths: number;
  maxTenorProductMonths: number;
  maxTenorFinalMonths: number;
  evaluatedTenorMonths: number;
  rawMaxPrincipalCapacity: Money;
  roundedMaxPrincipalCapacity: Money;
  maxProductPrincipal: Money;
  maxPrincipalFinal: Money;
  roundingIncrement: Money;
  isRequestedPrincipalValid?: boolean;
}

export class MaximumPrincipalService {
  /**
   * Calculates maximum loan principal capacity based on:
   * 1. Debtor's monthly payment capacity (Salary * DBR Maximum)
   * 2. Calculation method (FLAT formula vs ANNUITY/PV formula)
   * 3. Age boundary (remaining months until 84 years 11 months)
   * 4. Product limit (MIN(capacity, product max))
   * 5. Floor rounding increment (FLOOR to Rp 100.000)
   *
   * Strictly follows BUSINESS_RULES.md Sections 8, 16, 17, 18, 19.
   */
  static calculate(input: MaximumPrincipalInput): MaximumPrincipalResult {
    const calcDate = input.calculationDate || new Date();
    const birthDate = input.birthDate;

    const monthlySalary = Money.from(input.monthlySalary);
    const method: CalculationMethod =
      input.method === "ANNUITY" ? "ANNUITY" : "FLAT";
    const annualRate = input.annualMarginRate
      ? Percentage.fromDecimal(input.annualMarginRate)
      : Percentage.fromDecimal(0.108); // 10.8%
    const maxDbr = input.maxDbr
      ? Percentage.fromDecimal(input.maxDbr)
      : Percentage.fromDecimal(0.90); // 90%
    const maxProductTenorMonths = input.maxProductTenorMonths ?? 120;
    const maxProductPrincipal = input.maxProductPrincipal
      ? Money.from(input.maxProductPrincipal)
      : Money.from(200000000); // 200M
    const roundingIncrement = input.principalRoundingIncrement
      ? Money.from(input.principalRoundingIncrement)
      : Money.from(100000); // 100k

    const maxEffectiveAgeYears = input.maxEffectiveAgeYears ?? 84;
    const maxEffectiveAgeMonths = input.maxEffectiveAgeMonths ?? 11;
    const maxEffectiveTotalMonths =
      maxEffectiveAgeYears * 12 + maxEffectiveAgeMonths;

    // 1. Age Breakdown
    const ageAtCalc = calculateAgeBreakdown(birthDate, calcDate);

    // 2. Tenor Boundaries (Age vs Product) per Section 8
    const maxTenorAgeMonths = Math.max(
      0,
      maxEffectiveTotalMonths - ageAtCalc.totalMonths
    );
    const maxTenorFinalMonths = Math.min(
      maxProductTenorMonths,
      maxTenorAgeMonths
    );

    // If requestedTenor is given, evaluate at requestedTenor (capped at maxTenorFinal); otherwise at maxTenorFinal
    let evaluatedTenorMonths = input.requestedTenorMonths ?? maxTenorFinalMonths;
    if (evaluatedTenorMonths > maxTenorFinalMonths) {
      evaluatedTenorMonths = maxTenorFinalMonths;
    }

    // 3. Delegate to appropriate strategy
    const strategy =
      method === "ANNUITY"
        ? new AnnuityCalculationStrategy()
        : new FlatCalculationStrategy();

    const dummyPrincipal = Money.from(1000000); // placeholder principal to compute capacity
    const strategyResult = strategy.calculate({
      principal: dummyPrincipal,
      tenor: evaluatedTenorMonths,
      monthlySalary,
      annualMarginRate: annualRate,
      maxDbr,
      maxProductPrincipal,
      principalRoundingIncrement: roundingIncrement,
    });

    let isRequestedPrincipalValid: boolean | undefined;
    if (input.requestedPrincipal !== undefined) {
      const reqP = Money.from(input.requestedPrincipal);
      isRequestedPrincipalValid =
        reqP.isPositive() && reqP.lessThanOrEqual(strategyResult.maxPrincipalFinal);
    }

    return {
      method,
      monthlySalary,
      maxDbr,
      maxInstallment: strategyResult.maxInstallment,
      ageAtCalculationYears: ageAtCalc.years,
      ageAtCalculationMonths: ageAtCalc.months,
      maxEffectiveAgeYears,
      maxEffectiveAgeMonths,
      maxTenorAgeMonths,
      maxTenorProductMonths: maxProductTenorMonths,
      maxTenorFinalMonths,
      evaluatedTenorMonths,
      rawMaxPrincipalCapacity: strategyResult.rawMaxPrincipalCapacity,
      roundedMaxPrincipalCapacity: strategyResult.roundedMaxPrincipalCapacity,
      maxProductPrincipal,
      maxPrincipalFinal: strategyResult.maxPrincipalFinal,
      roundingIncrement,
      isRequestedPrincipalValid,
    };
  }
}
