import { describe, it, expect } from "vitest";
import {
  Money,
  Percentage,
  Tenor,
  InterestRate,
  Installment,
  InsurancePremium,
  Fee,
  Eligibility,
} from "@/lib/domain";

describe("TASK-025: Calculation Domain Model & Value Objects", () => {
  describe("Money Value Object", () => {
    it("should accurately perform arithmetic operations without floating-point errors", () => {
      const m1 = Money.from(100000000); // 100 Million
      const m2 = Money.from(50000000); // 50 Million

      expect(m1.add(m2).toNumber()).toBe(150000000);
      expect(m1.subtract(m2).toNumber()).toBe(50000000);
      expect(m1.multiply(0.108).toNumber()).toBe(10800000);
      expect(m1.divide(12).round(2).toNumber()).toBe(8333333.33);
    });

    it("should correctly floor to specific increments (e.g. Rp 100.000 rounding)", () => {
      const rawPrincipal = Money.from(145892340);
      const rounded = rawPrincipal.floorTo(100000);
      expect(rounded.toNumber()).toBe(145800000);

      const exact = Money.from(200000000);
      expect(exact.floorTo(100000).toNumber()).toBe(200000000);
    });

    it("should format as Indonesian Rupiah string", () => {
      const m = Money.from(200000000);
      const formatted = m.format();
      expect(formatted).toContain("200.000.000");
    });

    it("should handle comparisons properly", () => {
      const a = Money.from(100000);
      const b = Money.from(200000);
      const c = Money.from(100000);

      expect(a.lessThan(b)).toBe(true);
      expect(b.greaterThan(a)).toBe(true);
      expect(a.equals(c)).toBe(true);
      expect(a.greaterThanOrEqual(c)).toBe(true);
    });
  });

  describe("Percentage Value Object", () => {
    it("should create percentage from decimal and percent accurately", () => {
      const p1 = Percentage.fromDecimal(0.108);
      const p2 = Percentage.fromPercent(10.8);

      expect(p1.toDecimal()).toBe(0.108);
      expect(p1.toPercent()).toBe(10.8);
      expect(p1.equals(p2)).toBe(true);
      expect(p1.toBasisPoints()).toBe(1080);
    });

    it("should apply percentage to Money instance", () => {
      const principal = Money.from(200000000);
      const annualMarginRate = Percentage.fromDecimal(0.108);

      const annualMargin = annualMarginRate.applyTo(principal);
      expect(annualMargin.toNumber()).toBe(21600000);
    });

    it("should format percentage string with custom fraction digits", () => {
      const p = Percentage.fromDecimal(0.0049); // 0.49%
      expect(p.format(2)).toContain("0,49");
    });
  });

  describe("Tenor Value Object", () => {
    it("should calculate exact decimal years and insurance lookup tenor years (ceiling rule)", () => {
      // 12 months -> 1 insurance year
      const t12 = Tenor.fromMonths(12);
      expect(t12.months).toBe(12);
      expect(t12.years).toBe(1);
      expect(t12.insuranceTenorYears).toBe(1);

      // 24 months -> 2 insurance years
      const t24 = Tenor.fromMonths(24);
      expect(t24.insuranceTenorYears).toBe(2);

      // 25 months -> 3 insurance years (CEILING rule per BUSINESS_RULES.md §23.1)
      const t25 = Tenor.fromMonths(25);
      expect(t25.months).toBe(25);
      expect(t25.insuranceTenorYears).toBe(3);

      // 60 months -> 5 insurance years
      const t60 = Tenor.fromMonths(60);
      expect(t60.insuranceTenorYears).toBe(5);

      // 120 months -> 10 insurance years
      const t120 = Tenor.fromMonths(120);
      expect(t120.insuranceTenorYears).toBe(10);
    });

    it("should format tenor description", () => {
      const t = Tenor.fromMonths(120);
      expect(t.format()).toBe("120 Bulan (10 Tahun)");
    });
  });

  describe("InterestRate & Installment Domain Objects", () => {
    const rate = InterestRate.fromAnnualRate(0.108); // 10.8% per year
    const principal = Money.from(200000000); // 200 Million
    const tenor = Tenor.fromMonths(120); // 120 months

    it("should calculate flat monthly interest rate (0.9% p.m.)", () => {
      expect(rate.annualRate.toDecimal()).toBe(0.108);
      expect(rate.monthlyRate.toDecimal()).toBe(0.009); // 10.8% / 12 = 0.9%
    });

    it("should calculate FLAT monthly installment accurately", () => {
      const flat = Installment.calculate(principal, tenor, rate, "FLAT");
      expect(flat.method).toBe("FLAT");

      // Pokok = 200.000.000 / 120 = 1.666.666,67
      expect(flat.principalPortion.round(2).toNumber()).toBe(1666666.67);
      // Margin = 200.000.000 * 0.9% = 1.800.000
      expect(flat.interestPortion.toNumber()).toBe(1800000);
      // Total = 1.666.666,67 + 1.800.000 = 3.466.666,67
      expect(flat.monthlyInstallment.round(2).toNumber()).toBe(3466666.67);

      // Upfront installment deduction (2 periods) = 3.466.666,67 * 2 = 6.933.333,33
      const deduction = flat.calculateDeduction(2);
      expect(deduction.round(2).toNumber()).toBe(6933333.33);
    });

    it("should calculate ANNUITY (PMT) monthly installment accurately", () => {
      const annuity = Installment.calculate(principal, tenor, rate, "ANNUITY");
      expect(annuity.method).toBe("ANNUITY");
      // PMT(0.9%, 120, 200000000) = 2.732.406,72
      expect(annuity.monthlyInstallment.round(2).toNumber()).toBe(2732406.72);
    });
  });

  describe("InsurancePremium Domain Object", () => {
    it("should calculate breakdown of base premium, fronting fee, and reserve charge", () => {
      const principal = Money.from(200000000);
      const premiumRate = Percentage.fromDecimal(0.0049); // 0.49%
      const frontingRate = Percentage.fromDecimal(0.06); // 6%
      const reserveRate = Percentage.fromDecimal(0.215); // 21.5%

      const ins = InsurancePremium.calculate(
        principal,
        premiumRate,
        frontingRate,
        reserveRate
      );

      expect(ins.premiumAmount.toNumber()).toBe(980000); // 200M * 0.49%
      expect(ins.frontingAmount.toNumber()).toBe(12000000); // 200M * 6%
      expect(ins.reserveAmount.toNumber()).toBe(43000000); // 200M * 21.5%

      expect(ins.totalInsuranceCharge.toNumber()).toBe(55980000);
      expect(ins.combinedRate.toDecimal()).toBe(0.2799); // 0.0049 + 0.06 + 0.215
    });
  });

  describe("Fee Domain Object & Net Disbursement", () => {
    it("should calculate fee components and net disbursement per BUSINESS_RULES §36-37", () => {
      const principal = Money.from(200000000);
      const fee = Fee.calculate({
        principal,
        adminRate: 0.005, // 0.5% = 1.000.000
        provisionRate: 0.005, // 0.5% = 1.000.000
        verificationFee: 1500000,
        flaggingFee: 38000, // Rp 38.000
        installmentDeduction: 6933333,
        settlementPayoff: 50000000,
      });

      const insuranceCharge = Money.from(5000000);

      // Total Biaya = Admin(1M) + Provisi(1M) + Insurance(5M) + Verifikasi(1.5M) + PotonganAngsuran(6.933.333) = 15.433.333
      const totalFees = fee.calculateTotalFees(insuranceCharge);
      expect(totalFees.toNumber()).toBe(15433333);

      // Total Deductions = TotalFees(15.433.333) + Flagging(38.000) + Pelunasan(50.000.000) = 65.471.333
      const totalDeductions = fee.calculateTotalDeductions(insuranceCharge);
      expect(totalDeductions.toNumber()).toBe(65471333);

      // Terima Bersih = 200.000.000 - 65.471.333 = 134.528.667
      const netDisbursement = fee.calculateNetDisbursement(insuranceCharge);
      expect(netDisbursement.toNumber()).toBe(134528667);
    });
  });

  describe("Eligibility Domain Object", () => {
    it("should evaluate as OK when all criteria are met", () => {
      const result = Eligibility.evaluate({
        monthlySalary: 10000000,
        monthlyInstallment: 3466667,
        maxDbr: 0.90,
        requestedPrincipal: 100000000,
        maxPrincipalCapacity: 150000000,
        maxPrincipalProduct: 200000000,
        requestedTenor: 60,
        maxTenorAge: 120,
        maxTenorProduct: 120,
        ageAtCalculation: { years: 65, months: 0 },
        ageAtMaturity: { years: 70, months: 0 },
        maxEffectiveAge: { years: 84, months: 11 },
        netDisbursement: 85000000,
      });

      expect(result.status).toBe("OK");
      expect(result.isEligible).toBe(true);
      expect(result.reasons.length).toBe(0);
      expect(result.remainingSalary.toNumber()).toBe(6533333);
    });

    it("should evaluate as OVER and collect multiple reasons when multiple rules fail", () => {
      const result = Eligibility.evaluate({
        monthlySalary: 5000000,
        monthlyInstallment: 5000000, // DBR = 100% > 90%
        maxDbr: 0.90,
        requestedPrincipal: 250000000, // Exceeds max principal
        maxPrincipalCapacity: 100000000,
        maxPrincipalProduct: 200000000,
        requestedTenor: 144, // Exceeds max tenor
        maxTenorAge: 60,
        maxTenorProduct: 120,
        ageAtCalculation: { years: 80, months: 0 },
        ageAtMaturity: { years: 92, months: 0 }, // Exceeds max age (84y 11m)
        maxEffectiveAge: { years: 84, months: 11 },
        netDisbursement: -10000000, // Negative net disbursement
      });

      expect(result.status).toBe("OVER");
      expect(result.isEligible).toBe(false);
      expect(result.reasons.length).toBeGreaterThanOrEqual(4);
      expect(result.reasons.some((r) => r.includes("DBR"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("usia"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("Tenor"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("Plafon"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("Terima bersih"))).toBe(true);
    });
  });
});
