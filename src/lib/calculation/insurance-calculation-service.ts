import { db } from "@/lib/db";
import {
  Money,
  Percentage,
  Tenor,
  InsurancePremium,
} from "@/lib/domain";
import { InsuranceRateRepository } from "@/lib/repositories";
import { FeeParameter } from "@prisma/client";

export class MissingInsuranceRateError extends Error {
  readonly productId: string;
  readonly age: number;
  readonly tenorYears: number;

  constructor(productId: string, age: number, tenorYears: number) {
    super(
      `Tarif premi asuransi resmi untuk usia ${age} tahun dan tenor asuransi ${tenorYears} tahun tidak ditemukan pada produk ini. Perhitungan dibatalkan karena estimasi rate tidak diizinkan.`
    );
    this.name = "MissingInsuranceRateError";
    this.productId = productId;
    this.age = age;
    this.tenorYears = tenorYears;
  }
}

export interface InsuranceCalculationInput {
  productId: string;
  principal: Money | number | string;
  tenor: Tenor | number;
  age: number;
  feeParameter?: FeeParameter | null;
  version?: string;
}

export interface InsuranceCalculationResult {
  productId: string;
  currentAge: number;
  nextAge: number;
  tenorMonths: number;
  tenorYears: number;
  currentAgeRate: Percentage | null;
  nextAgeRate: Percentage | null;
  selectedPremiumRate: Percentage;
  frontingRate: Percentage;
  reserveRate: Percentage;
  combinedRate: Percentage;
  premium: InsurancePremium;
}

export class InsuranceCalculationService {
  /**
   * Calculates insurance premium, fronting fee, and reserve charge according to BUSINESS_RULES.md Sections 23-30.
   * STRICT: Throws MissingInsuranceRateError if official rate is missing (NO AI estimation).
   */
  static async calculate(
    input: InsuranceCalculationInput
  ): Promise<InsuranceCalculationResult> {
    const principal = Money.from(input.principal);
    const tenor = Tenor.fromMonths(input.tenor);
    const currentAge = input.age;
    const nextAge = currentAge + 1;

    // 1. Tenor Tahun Asuransi = CEILING(Tenor Bulan / 12) per Section 23.1
    const tenorYears = tenor.insuranceTenorYears;

    // 2. Dual Lookup: Current Age (Lookup 1) & Next Age (Lookup 2) per Section 25
    const [rate1Record, rate2Record] = await Promise.all([
      InsuranceRateRepository.lookup(input.productId, currentAge, tenorYears, input.version),
      InsuranceRateRepository.lookup(input.productId, nextAge, tenorYears, input.version),
    ]);

    // Critical Rule: Missing rate MUST be an error, NOT an AI estimation
    if (!rate1Record && !rate2Record) {
      throw new MissingInsuranceRateError(input.productId, currentAge, tenorYears);
    }

    const rate1 = rate1Record ? Percentage.fromDecimal(rate1Record.premiumRate.toString()) : null;
    const rate2 = rate2Record ? Percentage.fromDecimal(rate2Record.premiumRate.toString()) : null;

    // Section 25: Insurance Rate = MAX(Rate 1, Rate 2)
    let selectedPremiumRate: Percentage;
    if (rate1 && rate2) {
      selectedPremiumRate = rate1.greaterThanOrEqual(rate2) ? rate1 : rate2;
    } else if (rate1) {
      selectedPremiumRate = rate1;
    } else {
      selectedPremiumRate = rate2!;
    }

    // 3. Obtain Fronting Rate and Reserve Rate from FeeParameter or Product config
    let feeParam = input.feeParameter;
    if (feeParam === undefined) {
      feeParam = await db.feeParameter.findFirst({
        where: { productId: input.productId, isActive: true },
        orderBy: { effectiveFrom: "desc" },
      });
    }

    const frontingRate = feeParam?.frontingRate
      ? Percentage.fromDecimal(feeParam.frontingRate.toString())
      : Percentage.zero();

    const reserveRate = feeParam?.reserveRate
      ? Percentage.fromDecimal(feeParam.reserveRate.toString())
      : Percentage.zero();

    // 4. Calculate Complete Insurance Breakdown (Base Premium, Fronting, Reserve, Total Charge)
    const premium = InsurancePremium.calculate(
      principal,
      selectedPremiumRate,
      frontingRate,
      reserveRate
    );

    return {
      productId: input.productId,
      currentAge,
      nextAge,
      tenorMonths: tenor.months,
      tenorYears,
      currentAgeRate: rate1,
      nextAgeRate: rate2,
      selectedPremiumRate,
      frontingRate,
      reserveRate,
      combinedRate: premium.combinedRate,
      premium,
    };
  }
}
