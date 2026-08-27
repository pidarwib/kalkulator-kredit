import { Percentage } from "./percentage";
import { Money } from "./money";
import { Tenor } from "./tenor";
import { Prisma } from "@prisma/client";

/**
 * Immutable InterestRate Value Object.
 * Encapsulates single unified annual margin rate (e.g. 10.8% per year)
 * and monthly margin rate (annual / 12 = 0.9% per month) per BUSINESS_RULES.md Section 22.
 */
export class InterestRate {
  private readonly _annualRate: Percentage;
  private readonly _monthlyRate: Percentage;

  private constructor(annualRate: Percentage, monthlyRate?: Percentage) {
    this._annualRate = annualRate;
    this._monthlyRate = monthlyRate || annualRate.divide(12);
  }

  /**
   * Creates an InterestRate from flat annual rate (e.g. 0.108 for 10.8%).
   */
  static fromAnnualRate(annualRate: Percentage | number | string | Prisma.Decimal): InterestRate {
    const p = Percentage.fromDecimal(annualRate);
    return new InterestRate(p);
  }

  /**
   * Creates an InterestRate explicitly supplying both annual and monthly rates.
   */
  static fromRates(
    annualRate: Percentage | number | string | Prisma.Decimal,
    monthlyRate: Percentage | number | string | Prisma.Decimal
  ): InterestRate {
    const a = Percentage.fromDecimal(annualRate);
    const m = Percentage.fromDecimal(monthlyRate);
    return new InterestRate(a, m);
  }

  get annualRate(): Percentage {
    return this._annualRate;
  }

  get monthlyRate(): Percentage {
    return this._monthlyRate;
  }

  /**
   * Calculates monthly margin/interest under FLAT method:
   * Angsuran Margin = Plafon * Margin Flat Bulanan
   */
  calculateFlatMonthlyInterest(principal: Money): Money {
    return this._monthlyRate.applyTo(principal);
  }

  /**
   * Calculates total monthly installment under FLAT method:
   * Angsuran Bulanan = (Plafon / Tenor) + (Plafon * Margin Flat Bulanan)
   */
  calculateFlatMonthlyInstallment(principal: Money, tenor: Tenor): Money {
    if (tenor.isZero()) return Money.zero();
    const principalPortion = principal.divide(tenor.months);
    const interestPortion = this.calculateFlatMonthlyInterest(principal);
    return principalPortion.add(interestPortion);
  }

  /**
   * Calculates monthly installment under ANNUITY / PMT method per BUSINESS_RULES.md Section 13:
   * PMT formula: P * [ r * (1+r)^n ] / [ (1+r)^n - 1 ]
   * where r = monthly margin (0.9%), n = tenor in months.
   */
  calculatePmtMonthlyInstallment(principal: Money, tenor: Tenor): Money {
    if (tenor.isZero() || principal.isZero()) return Money.zero();

    const r = this._monthlyRate.toDecimal(); // e.g. 0.009
    const n = tenor.months;
    const P = principal.toNumber();

    if (r === 0) {
      return principal.divide(n);
    }

    // PMT = P * [ r / (1 - (1+r)^(-n)) ]
    const onePlusR = 1 + r;
    const power = Math.pow(onePlusR, -n);
    const denominator = 1 - power;
    const pmt = P * (r / denominator);

    return Money.from(pmt);
  }

  /**
   * Formats rate display (e.g. "10,80% p.a. (0,90% p.m.)").
   */
  format(): string {
    return `${this._annualRate.format(2)} p.a. (${this._monthlyRate.format(2)} p.m.)`;
  }

  toString(): string {
    return this.format();
  }
}
