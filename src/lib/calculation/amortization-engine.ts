import {
  Money,
  Percentage,
  Tenor,
  CalculationMethod,
} from "@/lib/domain";

export interface AmortizationScheduleItem {
  period: number;
  paymentDate: string; // ISO date YYYY-MM-DD
  openingBalance: Money;
  principalPortion: Money;
  interestPortion: Money;
  installment: Money;
  closingBalance: Money;
}

export interface AmortizationScheduleSummary {
  method: CalculationMethod;
  principal: Money;
  tenorMonths: number;
  annualMarginRate: Percentage;
  monthlyMarginRate: Percentage;
  totalPrincipalPaid: Money;
  totalInterestPaid: Money;
  totalInstallmentsPaid: Money;
  items: AmortizationScheduleItem[];
}

export interface GenerateAmortizationInput {
  principal: Money | number | string;
  tenor: Tenor | number;
  method?: CalculationMethod | string;
  annualMarginRate?: Percentage | number | string;
  startDate?: Date;
}

export class AmortizationEngine {
  /**
   * Generates a complete amortization schedule for FLAT or ANNUITY credit.
   * Ensures exact final balance reconciliation (closing balance at period n = 0).
   */
  static generateSchedule(
    input: GenerateAmortizationInput
  ): AmortizationScheduleSummary {
    const principal = Money.from(input.principal);
    const tenor = Tenor.fromMonths(input.tenor);
    const n = tenor.months;

    if (n <= 0 || principal.isZero() || principal.isNegative()) {
      return {
        method: input.method === "ANNUITY" ? "ANNUITY" : "FLAT",
        principal,
        tenorMonths: n,
        annualMarginRate: Percentage.fromDecimal(input.annualMarginRate || 0.108),
        monthlyMarginRate: Percentage.fromDecimal(0.009),
        totalPrincipalPaid: Money.zero(),
        totalInterestPaid: Money.zero(),
        totalInstallmentsPaid: Money.zero(),
        items: [],
      };
    }

    const method: CalculationMethod =
      input.method === "ANNUITY" ? "ANNUITY" : "FLAT";
    const annualRate = input.annualMarginRate
      ? Percentage.fromDecimal(input.annualMarginRate)
      : Percentage.fromDecimal(0.108); // 10.8%
    const monthlyRate = Percentage.fromDecimal(
      annualRate.decimal.dividedBy(12)
    ); // 0.9%

    const startDate = input.startDate || new Date();
    const items: AmortizationScheduleItem[] = [];

    if (method === "FLAT") {
      // -----------------------------------------------------------------------
      // FLAT METHOD AMORTIZATION
      // -----------------------------------------------------------------------
      // Fixed monthly interest = Principal * monthlyRate
      // Fixed monthly principal = Principal / n
      const monthlyInterest = monthlyRate.applyTo(principal);
      const standardPrincipalPortion = principal.divide(n);

      let currentOpening = principal;

      for (let k = 1; k <= n; k++) {
        const paymentDate = this.calculatePaymentDate(startDate, k);
        const openingBalance = currentOpening;
        let principalPortion: Money;
        let closingBalance: Money;

        if (k === n) {
          // Final Period Reconciliation: principal portion absorbs remaining balance
          principalPortion = openingBalance;
          closingBalance = Money.zero();
        } else {
          principalPortion = standardPrincipalPortion;
          closingBalance = openingBalance.subtract(principalPortion);
        }

        const installment = principalPortion.add(monthlyInterest);

        items.push({
          period: k,
          paymentDate,
          openingBalance,
          principalPortion,
          interestPortion: monthlyInterest,
          installment,
          closingBalance,
        });

        currentOpening = closingBalance;
      }
    } else {
      // -----------------------------------------------------------------------
      // ANNUITY / PMT METHOD AMORTIZATION
      // -----------------------------------------------------------------------
      // PMT Installment = P * (r / (1 - (1+r)^-n))
      const r = monthlyRate.toDecimal();
      const pmtNumber =
        r === 0
          ? principal.toNumber() / n
          : (principal.toNumber() * r) / (1 - Math.pow(1 + r, -n));
      const fixedPmt = Money.from(pmtNumber);

      let currentOpening = principal;

      for (let k = 1; k <= n; k++) {
        const paymentDate = this.calculatePaymentDate(startDate, k);
        const openingBalance = currentOpening;
        const interestPortion = monthlyRate.applyTo(openingBalance);
        let principalPortion: Money;
        let installment: Money;
        let closingBalance: Money;

        if (k === n) {
          // Final Period Reconciliation: pay off remaining opening balance exactly
          principalPortion = openingBalance;
          installment = principalPortion.add(interestPortion);
          closingBalance = Money.zero();
        } else {
          principalPortion = fixedPmt.subtract(interestPortion);
          installment = fixedPmt;
          closingBalance = openingBalance.subtract(principalPortion);
        }

        items.push({
          period: k,
          paymentDate,
          openingBalance,
          principalPortion,
          interestPortion,
          installment,
          closingBalance,
        });

        currentOpening = closingBalance;
      }
    }

    // Totals accumulation
    let totalPrincipalPaid = Money.zero();
    let totalInterestPaid = Money.zero();
    let totalInstallmentsPaid = Money.zero();

    for (const item of items) {
      totalPrincipalPaid = totalPrincipalPaid.add(item.principalPortion);
      totalInterestPaid = totalInterestPaid.add(item.interestPortion);
      totalInstallmentsPaid = totalInstallmentsPaid.add(item.installment);
    }

    return {
      method,
      principal,
      tenorMonths: n,
      annualMarginRate: annualRate,
      monthlyMarginRate: monthlyRate,
      totalPrincipalPaid,
      totalInterestPaid,
      totalInstallmentsPaid,
      items,
    };
  }

  /**
   * Calculates the payment date for a given period month offset.
   */
  private static calculatePaymentDate(startDate: Date, periodMonthOffset: number): string {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + periodMonthOffset);
    return d.toISOString().split("T")[0];
  }
}
