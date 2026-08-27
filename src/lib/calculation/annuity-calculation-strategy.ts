import {
  Money,
  Percentage,
  Tenor,
  InterestRate,
  Installment,
  CalculationMethod,
} from "@/lib/domain";
import {
  ICalculationStrategy,
  CalculationStrategyInput,
  CalculationStrategyResult,
} from "./calculation-strategy";
import { Prisma } from "@prisma/client";

/**
 * AnnuityCalculationStrategy implements the ANNUITY / PMT installment and credit capacity calculation
 * strictly according to BUSINESS_RULES.md Section 13, 14, 17, 18, 19.
 *
 * Rate: Same annual rate as FLAT (10.8% / 12 = 0.9% per month), without separate effective rate conversion.
 */
export class AnnuityCalculationStrategy implements ICalculationStrategy {
  readonly method: CalculationMethod = "ANNUITY";

  calculate(input: CalculationStrategyInput): CalculationStrategyResult {
    const principal = Money.from(input.principal);
    const tenor = Tenor.fromMonths(input.tenor);
    const monthlySalary = Money.from(input.monthlySalary);

    // Default parameters from BUSINESS_RULES.md if not specified
    const annualRate = input.annualMarginRate
      ? Percentage.fromDecimal(input.annualMarginRate)
      : Percentage.fromDecimal(0.108); // 10.8%

    const maxDbr = input.maxDbr
      ? Percentage.fromDecimal(input.maxDbr)
      : Percentage.fromDecimal(0.9); // 90%

    const maxProductPrincipal = input.maxProductPrincipal
      ? Money.from(input.maxProductPrincipal)
      : Money.from(200000000); // Rp 200.000.000

    const roundingIncrement = input.principalRoundingIncrement
      ? Money.from(input.principalRoundingIncrement)
      : Money.from(100000); // Rp 100.000

    // 1. Unified Interest Rate (Annual: 10.8%, Monthly: 0.9%) per Section 14
    const interestRate = InterestRate.fromAnnualRate(annualRate);

    // 2. Installment Breakdown under ANNUITY / PMT method per Section 13
    const installment = Installment.calculate(
      principal,
      tenor,
      interestRate,
      "ANNUITY"
    );

    // 3. DBR Calculation: Angsuran Bulanan / Gaji Bersih
    let dbr: Percentage;
    if (monthlySalary.isZero() || monthlySalary.isNegative()) {
      dbr = Percentage.fromPercent(100);
    } else {
      const dbrDecimal = installment.monthlyInstallment.amount.dividedBy(
        monthlySalary.amount
      );
      dbr = Percentage.fromDecimal(dbrDecimal);
    }

    // 4. Maximum Installment Capacity: Gaji Bersih * DBR Maksimum
    const maxInstallment = maxDbr.applyTo(monthlySalary);

    // 5. Remaining Salary: Gaji Bersih - Angsuran Bulanan
    const remainingSalary = monthlySalary.subtract(
      installment.monthlyInstallment
    );

    // 6. Maximum Principal Capacity under ANNUITY method per BUSINESS_RULES.md Section 17:
    // PV = Payment * (1 - (1+r)^(-n)) / r
    // where Payment = Maksimal Angsuran, r = Margin Bulanan (0.009), n = Tenor Bulan
    let rawMaxPrincipalCapacity: Money;
    if (tenor.isZero() || monthlySalary.isZero() || monthlySalary.isNegative()) {
      rawMaxPrincipalCapacity = Money.zero();
    } else {
      const r = interestRate.monthlyRate.toDecimal(); // e.g. 0.009
      const n = tenor.months;
      const payment = maxInstallment.toNumber();

      if (r === 0) {
        rawMaxPrincipalCapacity = maxInstallment.multiply(n);
      } else {
        const onePlusR = 1 + r;
        const power = Math.pow(onePlusR, -n);
        const numerator = 1 - power;
        const pv = payment * (numerator / r);
        rawMaxPrincipalCapacity = Money.from(pv);
      }
    }

    // 7. Floor rounding to increment (e.g. Rp 100.000 per Section 19)
    const roundedMaxPrincipalCapacity = rawMaxPrincipalCapacity.floorTo(
      roundingIncrement
    );

    // 8. Maximum Principal Final: MIN(Plafon Kemampuan Dibulatkan, Batas Plafon Produk)
    const maxPrincipalFinal = roundedMaxPrincipalCapacity.lessThan(
      maxProductPrincipal
    )
      ? roundedMaxPrincipalCapacity
      : maxProductPrincipal;

    // 9. Validation Flags
    const isDbrValid = dbr.lessThanOrEqual(maxDbr);
    const isPrincipalValid =
      principal.isPositive() && principal.lessThanOrEqual(maxPrincipalFinal);

    return {
      method: "ANNUITY",
      interestRate,
      installment,
      dbr,
      maxDbr,
      maxInstallment,
      remainingSalary,
      rawMaxPrincipalCapacity,
      roundedMaxPrincipalCapacity,
      maxProductPrincipal,
      maxPrincipalFinal,
      isDbrValid,
      isPrincipalValid,
    };
  }
}
