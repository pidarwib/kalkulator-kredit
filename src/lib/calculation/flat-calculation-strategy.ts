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
 * FlatCalculationStrategy implements the FLAT installment and credit capacity calculation
 * strictly according to BUSINESS_RULES.md Section 9, 10, 12, 16, 18, 19.
 */
export class FlatCalculationStrategy implements ICalculationStrategy {
  readonly method: CalculationMethod = "FLAT";

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

    // 1. Unified Interest Rate (Annual: 10.8%, Monthly: 0.9%)
    const interestRate = InterestRate.fromAnnualRate(annualRate);

    // 2. Installment Breakdown under FLAT method
    const installment = Installment.calculate(
      principal,
      tenor,
      interestRate,
      "FLAT"
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

    // 6. Maximum Principal Capacity under FLAT method per BUSINESS_RULES.md Section 16:
    // Plafon Maksimum Kemampuan = (Maksimal Angsuran * Tenor) / (1 + (Margin Flat Bulanan * Tenor))
    let rawMaxPrincipalCapacity: Money;
    if (tenor.isZero() || monthlySalary.isZero() || monthlySalary.isNegative()) {
      rawMaxPrincipalCapacity = Money.zero();
    } else {
      const n = new Prisma.Decimal(tenor.months);
      const r = interestRate.monthlyRate.decimal; // 0.009
      const numerator = maxInstallment.amount.times(n);
      const denominator = new Prisma.Decimal(1).plus(r.times(n));
      const rawCap = numerator.dividedBy(denominator);
      rawMaxPrincipalCapacity = Money.from(rawCap);
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
      method: "FLAT",
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
