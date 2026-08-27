import { Money } from "./money";
import { Percentage } from "./percentage";

/**
 * Immutable InsurancePremium Domain Object.
 * Encapsulates the breakdown of insurance charges:
 * 1. Base Insurance Premium (Premi Asuransi)
 * 2. Fronting Fee (Fee Fronting)
 * 3. Reserve (Pencadangan)
 * per BUSINESS_RULES.md Section 26-30.
 */
export class InsurancePremium {
  readonly principal: Money;
  readonly premiumRate: Percentage;
  readonly premiumAmount: Money;
  readonly frontingRate: Percentage;
  readonly frontingAmount: Money;
  readonly reserveRate: Percentage;
  readonly reserveAmount: Money;
  readonly combinedRate: Percentage;
  readonly totalInsuranceCharge: Money;

  private constructor(params: {
    principal: Money;
    premiumRate: Percentage;
    premiumAmount: Money;
    frontingRate: Percentage;
    frontingAmount: Money;
    reserveRate: Percentage;
    reserveAmount: Money;
    combinedRate: Percentage;
    totalInsuranceCharge: Money;
  }) {
    this.principal = params.principal;
    this.premiumRate = params.premiumRate;
    this.premiumAmount = params.premiumAmount;
    this.frontingRate = params.frontingRate;
    this.frontingAmount = params.frontingAmount;
    this.reserveRate = params.reserveRate;
    this.reserveAmount = params.reserveAmount;
    this.combinedRate = params.combinedRate;
    this.totalInsuranceCharge = params.totalInsuranceCharge;
  }

  /**
   * Calculates InsurancePremium breakdown.
   */
  static calculate(
    principal: Money | number | string,
    premiumRate: Percentage | number | string,
    frontingRate?: Percentage | number | string,
    reserveRate?: Percentage | number | string
  ): InsurancePremium {
    const p = Money.from(principal);
    const premRate = Percentage.fromDecimal(premiumRate);
    const frontRate = frontingRate ? Percentage.fromDecimal(frontingRate) : Percentage.zero();
    const resRate = reserveRate ? Percentage.fromDecimal(reserveRate) : Percentage.zero();

    const premiumAmount = premRate.applyTo(p);
    const frontingAmount = frontRate.applyTo(p);
    const reserveAmount = resRate.applyTo(p);

    const combinedRate = premRate.add(frontRate).add(resRate);
    const totalInsuranceCharge = premiumAmount.add(frontingAmount).add(reserveAmount);

    return new InsurancePremium({
      principal: p,
      premiumRate: premRate,
      premiumAmount,
      frontingRate: frontRate,
      frontingAmount,
      reserveRate: resRate,
      reserveAmount,
      combinedRate,
      totalInsuranceCharge,
    });
  }

  /**
   * Returns a zero insurance premium.
   */
  static zero(principal: Money = Money.zero()): InsurancePremium {
    return this.calculate(principal, 0, 0, 0);
  }
}
