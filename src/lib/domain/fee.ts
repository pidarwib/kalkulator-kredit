import { Money } from "./money";
import { Percentage } from "./percentage";
import { InsurancePremium } from "./insurance-premium";

/**
 * Immutable Fee Domain Object.
 * Encapsulates standard fee breakdown, deductions, and net disbursement calculation
 * per BUSINESS_RULES.md Section 31-37.
 */
export class Fee {
  readonly principal: Money;
  readonly adminRate: Percentage;
  readonly adminFee: Money;
  readonly provisionRate: Percentage;
  readonly provisionFee: Money;
  readonly verificationFee: Money;
  readonly flaggingFee: Money;
  readonly installmentDeduction: Money;
  readonly otherFee: Money;
  readonly settlementPayoff: Money;
  readonly otherDeductions: Money;

  private constructor(params: {
    principal: Money;
    adminRate: Percentage;
    adminFee: Money;
    provisionRate: Percentage;
    provisionFee: Money;
    verificationFee: Money;
    flaggingFee: Money;
    installmentDeduction: Money;
    otherFee: Money;
    settlementPayoff: Money;
    otherDeductions: Money;
  }) {
    this.principal = params.principal;
    this.adminRate = params.adminRate;
    this.adminFee = params.adminFee;
    this.provisionRate = params.provisionRate;
    this.provisionFee = params.provisionFee;
    this.verificationFee = params.verificationFee;
    this.flaggingFee = params.flaggingFee;
    this.installmentDeduction = params.installmentDeduction;
    this.otherFee = params.otherFee;
    this.settlementPayoff = params.settlementPayoff;
    this.otherDeductions = params.otherDeductions;
  }

  /**
   * Factory method to calculate all fees from rates and amounts.
   */
  static calculate(params: {
    principal: Money | number | string;
    adminRate?: Percentage | number | string;
    provisionRate?: Percentage | number | string;
    verificationFee?: Money | number | string;
    flaggingFee?: Money | number | string;
    installmentDeduction?: Money | number | string;
    otherFee?: Money | number | string;
    settlementPayoff?: Money | number | string;
    otherDeductions?: Money | number | string;
  }): Fee {
    const p = Money.from(params.principal);
    const admRate = params.adminRate ? Percentage.fromDecimal(params.adminRate) : Percentage.zero();
    const provRate = params.provisionRate ? Percentage.fromDecimal(params.provisionRate) : Percentage.zero();

    const adminFee = admRate.applyTo(p);
    const provisionFee = provRate.applyTo(p);
    const verificationFee = params.verificationFee ? Money.from(params.verificationFee) : Money.from(1500000);
    const flaggingFee = params.flaggingFee ? Money.from(params.flaggingFee) : Money.from(38000);
    const installmentDeduction = params.installmentDeduction ? Money.from(params.installmentDeduction) : Money.zero();
    const otherFee = params.otherFee ? Money.from(params.otherFee) : Money.zero();
    const settlementPayoff = params.settlementPayoff ? Money.from(params.settlementPayoff) : Money.zero();
    const otherDeductions = params.otherDeductions ? Money.from(params.otherDeductions) : Money.zero();

    return new Fee({
      principal: p,
      adminRate: admRate,
      adminFee,
      provisionRate: provRate,
      provisionFee,
      verificationFee,
      flaggingFee,
      installmentDeduction,
      otherFee,
      settlementPayoff,
      otherDeductions,
    });
  }

  /**
   * Total Biaya per BUSINESS_RULES.md Section 36:
   * Total Biaya = Biaya Admin + Biaya Provisi + Total Insurance Charge + Biaya Verifikasi + Potongan Angsuran + Biaya Lainnya
   * (Does NOT include Biaya Flagging, Angka Pelunasan, or Potongan Lainnya).
   */
  calculateTotalFees(insuranceCharge: Money | InsurancePremium | number | string): Money {
    const ins =
      insuranceCharge instanceof InsurancePremium
        ? insuranceCharge.totalInsuranceCharge
        : Money.from(insuranceCharge);

    return this.adminFee
      .add(this.provisionFee)
      .add(ins)
      .add(this.verificationFee)
      .add(this.installmentDeduction)
      .add(this.otherFee);
  }

  /**
   * Total Deductions (all items deducted from requested principal).
   */
  calculateTotalDeductions(insuranceCharge: Money | InsurancePremium | number | string): Money {
    const totalFees = this.calculateTotalFees(insuranceCharge);
    return totalFees
      .add(this.flaggingFee)
      .add(this.settlementPayoff)
      .add(this.otherDeductions);
  }

  /**
   * Terima Bersih per BUSINESS_RULES.md Section 37:
   * Terima Bersih = Plafon Pengajuan - Total Biaya - Angka Pelunasan - Biaya Flagging - Potongan Lainnya
   */
  calculateNetDisbursement(insuranceCharge: Money | InsurancePremium | number | string): Money {
    const totalDeductions = this.calculateTotalDeductions(insuranceCharge);
    return this.principal.subtract(totalDeductions);
  }
}
