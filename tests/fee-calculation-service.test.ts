import { describe, it, expect, beforeAll } from "vitest";
import {
  FeeCalculationService,
  FeeParameterNotFoundError,
} from "@/lib/calculation";
import { db } from "@/lib/db";
import { Money } from "@/lib/domain";

describe("TASK-030: Fee Calculation Service Unit & Integration Tests", () => {
  let seededProductId: string;
  let seededPaymentOfficeId: string;

  beforeAll(async () => {
    const product = await db.product.findFirst({
      where: { code: "PLATINUM_MADIUN" },
    });

    const bpr = await db.bpr.findUnique({
      where: { code: "BPR_KOTA_MADIUN" },
      include: { paymentOffices: true },
    });

    if (!product || !bpr || bpr.paymentOffices.length === 0) {
      throw new Error("Seeded product or payment offices not found");
    }

    seededProductId = product.id;
    seededPaymentOfficeId = bpr.paymentOffices[0].id;
  }, 45000);

  describe("Standard Fee Breakdown & Deductions per BUSINESS_RULES §31-37", () => {
    it("should calculate exact fee breakdown and net disbursement for standard 200M loan", async () => {
      const principal = Money.from(200000000);
      const monthlyInstallment = Money.from(3466666.67);
      const insuranceCharge = Money.from(55980000);

      const result = await FeeCalculationService.calculate({
        productId: seededProductId,
        principal,
        monthlyInstallment,
        insuranceCharge,
        installmentDeductionPeriods: 2,
      });

      expect(result.productId).toBe(seededProductId);

      // 1. Admin Fee (0.5% = 1.000.000)
      expect(result.adminRate.toDecimal()).toBe(0.005);
      expect(result.adminFee.toNumber()).toBe(1000000);

      // 2. Provision Fee (0.5% = 1.000.000)
      expect(result.provisionRate.toDecimal()).toBe(0.005);
      expect(result.provisionFee.toNumber()).toBe(1000000);

      // 3. Verification Fee (Rp 1.500.000)
      expect(result.verificationFee.toNumber()).toBe(1500000);

      // 4. Flagging Fee (Rp 38.000)
      expect(result.flaggingFee.toNumber()).toBe(38000);

      // 5. Installment Deduction (2 * 3.466.666,67 = 6.933.333,34)
      expect(result.installmentDeductionPeriods).toBe(2);
      expect(result.installmentDeduction.round(2).toNumber()).toBe(6933333.34);

      // 6. Total Biaya per §36: Admin(1M) + Provisi(1M) + Insurance(55.98M) + Verifikasi(1.5M) + PotonganAngsuran(6.933.333,34) = 66.413.333,34
      // CRITICAL: Total Biaya MUST NOT include Flagging (38.000) or Payoff!
      expect(result.totalFees.round(2).toNumber()).toBe(66413333.34);

      // 7. Total Deductions = TotalFees(66.413.333,34) + Flagging(38.000) = 66.451.333,34
      expect(result.totalDeductions.round(2).toNumber()).toBe(66451333.34);

      // 8. Terima Bersih per §37 = 200.000.000 - 66.451.333,34 = 133.548.666,66
      expect(result.netDisbursement.round(2).toNumber()).toBe(133548666.66);
    });

    it("should handle settlement payoff (angka pelunasan) and additional deductions", async () => {
      const principal = Money.from(100000000);
      const monthlyInstallment = Money.from(2566666.67);
      const insuranceCharge = Money.from(15000000);
      const settlementPayoff = Money.from(30000000); // 30M payoff
      const otherFee = Money.from(250000); // 250k other fee
      const otherDeductions = Money.from(500000); // 500k other deductions

      const result = await FeeCalculationService.calculate({
        productId: seededProductId,
        principal,
        monthlyInstallment,
        insuranceCharge,
        settlementPayoff,
        otherFee,
        otherDeductions,
      });

      // Admin = 500k, Provision = 500k, Insurance = 15M, Verification = 1.5M, InstallmentDeduction = 5.133.333,34, OtherFee = 250k
      // Total Biaya = 500k + 500k + 15M + 1.5M + 5.133.333,34 + 250k = 22.883.333,34
      expect(result.totalFees.round(2).toNumber()).toBe(22883333.34);

      // Total Deductions = TotalBiaya + Flagging(38k) + Payoff(30M) + OtherDeductions(500k) = 53.421.333,34
      expect(result.totalDeductions.round(2).toNumber()).toBe(53421333.34);

      // Terima Bersih = 100M - 53.421.333,34 = 46.578.666,66
      expect(result.netDisbursement.round(2).toNumber()).toBe(46578666.66);
    });
  });

  describe("Payment Office Fallback & Error Handling", () => {
    it("should fallback to default product fee parameter when payment office has no specific override", async () => {
      const result = await FeeCalculationService.calculate({
        productId: seededProductId,
        paymentOfficeId: seededPaymentOfficeId,
        principal: 50000000,
        monthlyInstallment: 1000000,
        insuranceCharge: 2000000,
      });

      expect(result.verificationFee.toNumber()).toBe(1500000);
      expect(result.flaggingFee.toNumber()).toBe(38000);
    });

    it("should throw FeeParameterNotFoundError for non-existent product", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      await expect(
        FeeCalculationService.calculate({
          productId: fakeId,
          principal: 50000000,
          monthlyInstallment: 1000000,
          insuranceCharge: 2000000,
        })
      ).rejects.toThrow(FeeParameterNotFoundError);
    });
  });
});
