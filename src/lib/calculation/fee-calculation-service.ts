import { db } from "@/lib/db";
import {
  Money,
  Percentage,
  Fee,
  InsurancePremium,
} from "@/lib/domain";
import { FeeParameterRepository } from "@/lib/repositories";
import { FeeParameter } from "@prisma/client";

export class FeeParameterNotFoundError extends Error {
  readonly productId: string;
  readonly paymentOfficeId?: string | null;

  constructor(productId: string, paymentOfficeId?: string | null) {
    super(
      `Parameter biaya aktif untuk produk ID '${productId}' ${
        paymentOfficeId ? `dan kantor bayar '${paymentOfficeId}' ` : ""
      }tidak ditemukan dalam sistem.`
    );
    this.name = "FeeParameterNotFoundError";
    this.productId = productId;
    this.paymentOfficeId = paymentOfficeId;
  }
}

export interface FeeCalculationInput {
  productId: string;
  principal: Money | number | string;
  monthlyInstallment: Money | number | string;
  insuranceCharge: Money | InsurancePremium | number | string;
  paymentOfficeId?: string | null;
  installmentDeductionPeriods?: number;
  settlementPayoff?: Money | number | string;
  otherFee?: Money | number | string;
  otherDeductions?: Money | number | string;
  feeParameter?: FeeParameter | null;
}

export interface FeeCalculationResult {
  productId: string;
  paymentOfficeId: string | null;
  principal: Money;
  adminRate: Percentage;
  adminFee: Money;
  provisionRate: Percentage;
  provisionFee: Money;
  verificationFee: Money;
  flaggingFee: Money;
  installmentDeductionPeriods: number;
  installmentDeduction: Money;
  insuranceCharge: Money;
  otherFee: Money;
  settlementPayoff: Money;
  otherDeductions: Money;
  totalFees: Money;
  totalDeductions: Money;
  netDisbursement: Money;
  fee: Fee;
}

export class FeeCalculationService {
  /**
   * Calculates all credit fees, installment deductions, and net disbursement
   * strictly adhering to BUSINESS_RULES.md Sections 31-37.
   */
  static async calculate(
    input: FeeCalculationInput
  ): Promise<FeeCalculationResult> {
    const principal = Money.from(input.principal);
    const installment = Money.from(input.monthlyInstallment);
    const insCharge =
      input.insuranceCharge instanceof InsurancePremium
        ? input.insuranceCharge.totalInsuranceCharge
        : Money.from(input.insuranceCharge);

    // 1. Resolve active FeeParameter (by specific payment office or BPR product default fallback)
    let feeParam = input.feeParameter;
    if (!feeParam) {
      const activeParam = await FeeParameterRepository.findActive(
        input.productId,
        input.paymentOfficeId || undefined
      );

      if (!activeParam) {
        throw new FeeParameterNotFoundError(
          input.productId,
          input.paymentOfficeId
        );
      }
      feeParam = activeParam;
    }

    const adminRate = Percentage.fromDecimal(feeParam.adminRate.toString());
    const provisionRate = Percentage.fromDecimal(
      feeParam.provisionRate.toString()
    );
    const verificationFee = Money.from(feeParam.verificationFee.toString());
    const flaggingFee = Money.from(feeParam.flaggingFee.toString());

    // 2. Installment Deduction: Default 2 periods per Section 35
    const deductionPeriods =
      input.installmentDeductionPeriods !== undefined
        ? input.installmentDeductionPeriods
        : 2;
    const installmentDeduction = installment.multiply(deductionPeriods);

    const otherFee = input.otherFee ? Money.from(input.otherFee) : Money.zero();
    const settlementPayoff = input.settlementPayoff
      ? Money.from(input.settlementPayoff)
      : Money.zero();
    const otherDeductions = input.otherDeductions
      ? Money.from(input.otherDeductions)
      : Money.zero();

    // 3. Construct Fee Domain Model
    const fee = Fee.calculate({
      principal,
      adminRate,
      provisionRate,
      verificationFee,
      flaggingFee,
      installmentDeduction,
      otherFee,
      settlementPayoff,
      otherDeductions,
    });

    // 4. Calculate Total Biaya per Section 36:
    // Total Biaya = Biaya Admin + Biaya Provisi + Total Insurance Charge + Biaya Verifikasi + Potongan Angsuran + Biaya Lainnya
    // (CRITICAL: Does NOT include Biaya Flagging, Angka Pelunasan, or Potongan Lainnya).
    const totalFees = fee.calculateTotalFees(insCharge);

    // 5. Total Deductions = Total Biaya + Biaya Flagging + Angka Pelunasan + Potongan Lainnya
    const totalDeductions = fee.calculateTotalDeductions(insCharge);

    // 6. Terima Bersih per Section 37: Plafon - Total Deductions
    const netDisbursement = fee.calculateNetDisbursement(insCharge);

    return {
      productId: input.productId,
      paymentOfficeId: input.paymentOfficeId || null,
      principal,
      adminRate,
      adminFee: fee.adminFee,
      provisionRate,
      provisionFee: fee.provisionFee,
      verificationFee,
      flaggingFee,
      installmentDeductionPeriods: deductionPeriods,
      installmentDeduction,
      insuranceCharge: insCharge,
      otherFee,
      settlementPayoff,
      otherDeductions,
      totalFees,
      totalDeductions,
      netDisbursement,
      fee,
    };
  }
}
