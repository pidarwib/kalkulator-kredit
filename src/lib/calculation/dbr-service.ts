import { Money, Percentage } from "@/lib/domain";

export interface DbrEvaluationResult {
  dbr: Percentage;
  maxDbr: Percentage;
  monthlySalary: Money;
  monthlyInstallment: Money;
  maxInstallment: Money;
  remainingSalary: Money;
  isValid: boolean;
  status: "OK" | "OVER";
  reason?: string;
}

export class DbrService {
  /**
   * Calculates Debt Burden Ratio (DBR) = Monthly Installment / Net Monthly Salary.
   * Uses high-precision Decimal arithmetic per BUSINESS_RULES.md Section 9.
   */
  static calculateDbr(
    monthlyInstallment: Money | number | string,
    monthlySalary: Money | number | string
  ): Percentage {
    const installment = Money.from(monthlyInstallment);
    const salary = Money.from(monthlySalary);

    if (salary.isZero() || salary.isNegative()) {
      return Percentage.fromPercent(100);
    }

    const dbrDecimal = installment.amount.dividedBy(salary.amount);
    return Percentage.fromDecimal(dbrDecimal);
  }

  /**
   * Calculates Maximum Allowable Installment = Net Monthly Salary * Maximum DBR.
   * Default Maximum DBR is 90% (0.90) per BUSINESS_RULES.md Section 10.1.
   */
  static calculateMaxInstallment(
    monthlySalary: Money | number | string,
    maxDbr: Percentage | number | string = 0.90
  ): Money {
    const salary = Money.from(monthlySalary);
    const dbrLimit = Percentage.fromDecimal(maxDbr);
    return dbrLimit.applyTo(salary);
  }

  /**
   * Calculates Remaining Salary = Net Monthly Salary - Monthly Installment.
   */
  static calculateRemainingSalary(
    monthlySalary: Money | number | string,
    monthlyInstallment: Money | number | string
  ): Money {
    const salary = Money.from(monthlySalary);
    const installment = Money.from(monthlyInstallment);
    return salary.subtract(installment);
  }

  /**
   * Evaluates complete DBR compliance against maximum threshold.
   * CRITICAL: Evaluates internal exact Decimal value, NOT rounded display value.
   * Boundary rule: DBR <= 90% -> OK; DBR > 90% -> OVER per Section 9.1.
   */
  static evaluateDbr(
    monthlyInstallment: Money | number | string,
    monthlySalary: Money | number | string,
    maxDbr: Percentage | number | string = 0.90
  ): DbrEvaluationResult {
    const salary = Money.from(monthlySalary);
    const installment = Money.from(monthlyInstallment);
    const dbrLimit = Percentage.fromDecimal(maxDbr);

    const dbr = this.calculateDbr(installment, salary);
    const maxInstallment = this.calculateMaxInstallment(salary, dbrLimit);
    const remainingSalary = this.calculateRemainingSalary(salary, installment);

    // Strict boundary comparison on unrounded internal decimals
    const isValid = !salary.isZero() && !salary.isNegative() && dbr.lessThanOrEqual(dbrLimit);
    const status: "OK" | "OVER" = isValid ? "OK" : "OVER";

    let reason: string | undefined;
    if (!isValid) {
      if (salary.isZero() || salary.isNegative()) {
        reason = "Gaji bersih debitur harus lebih besar dari Rp 0.";
      } else {
        reason = `DBR (${dbr.format(2)}) melebihi batas maksimum yang diizinkan (${dbrLimit.format(2)}).`;
      }
    }

    return {
      dbr,
      maxDbr: dbrLimit,
      monthlySalary: salary,
      monthlyInstallment: installment,
      maxInstallment,
      remainingSalary,
      isValid,
      status,
      reason,
    };
  }
}
