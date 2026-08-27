import { Money } from "./money";
import { Tenor } from "./tenor";
import { InterestRate } from "./interest-rate";

export type CalculationMethod = "FLAT" | "ANNUITY";

/**
 * Immutable Installment Domain Object.
 * Encapsulates the complete installment breakdown (principal portion, interest portion, total monthly payment).
 */
export class Installment {
  readonly method: CalculationMethod;
  readonly principal: Money;
  readonly tenor: Tenor;
  readonly interestRate: InterestRate;
  readonly monthlyInstallment: Money;
  readonly principalPortion: Money;
  readonly interestPortion: Money;

  private constructor(params: {
    method: CalculationMethod;
    principal: Money;
    tenor: Tenor;
    interestRate: InterestRate;
    monthlyInstallment: Money;
    principalPortion: Money;
    interestPortion: Money;
  }) {
    this.method = params.method;
    this.principal = params.principal;
    this.tenor = params.tenor;
    this.interestRate = params.interestRate;
    this.monthlyInstallment = params.monthlyInstallment;
    this.principalPortion = params.principalPortion;
    this.interestPortion = params.interestPortion;
  }

  /**
   * Calculates Installment according to the chosen method (FLAT or ANNUITY).
   */
  static calculate(
    principal: Money | number | string,
    tenor: Tenor | number,
    interestRate: InterestRate,
    method: CalculationMethod = "FLAT"
  ): Installment {
    const p = Money.from(principal);
    const t = Tenor.fromMonths(tenor);

    if (method === "FLAT") {
      const principalPortion = t.isZero() ? Money.zero() : p.divide(t.months);
      const interestPortion = interestRate.calculateFlatMonthlyInterest(p);
      const monthlyInstallment = principalPortion.add(interestPortion);

      return new Installment({
        method: "FLAT",
        principal: p,
        tenor: t,
        interestRate,
        monthlyInstallment,
        principalPortion,
        interestPortion,
      });
    } else {
      // ANNUITY / PMT
      const monthlyInstallment = interestRate.calculatePmtMonthlyInstallment(p, t);
      // For annuity Month 1 initial interest breakdown:
      const interestPortion = interestRate.calculateFlatMonthlyInterest(p);
      const principalPortion = monthlyInstallment.subtract(interestPortion);

      return new Installment({
        method: "ANNUITY",
        principal: p,
        tenor: t,
        interestRate,
        monthlyInstallment,
        principalPortion,
        interestPortion,
      });
    }
  }

  /**
   * Calculates installment deduction upfront (e.g. 2 x monthly installment per BUSINESS_RULES.md Section 35).
   */
  calculateDeduction(periods = 2): Money {
    return this.monthlyInstallment.multiply(periods);
  }

  /**
   * Formats installment display string.
   */
  format(): string {
    return `${this.monthlyInstallment.format()} / bulan (${this.method})`;
  }
}
