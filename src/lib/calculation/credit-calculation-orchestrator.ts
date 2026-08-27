import { db } from "@/lib/db";
import {
  Money,
  Percentage,
  Tenor,
  CalculationMethod,
} from "@/lib/domain";
import {
  CalculationInputValidator,
  ValidatedCalculationInput,
} from "./calculation-input-validator";
import { FlatCalculationStrategy } from "./flat-calculation-strategy";
import { AnnuityCalculationStrategy } from "./annuity-calculation-strategy";
import { InsuranceCalculationService } from "./insurance-calculation-service";
import { FeeCalculationService } from "./fee-calculation-service";
import { MaximumPrincipalService } from "./maximum-principal-service";
import { EligibilityService } from "./eligibility-service";
import { AmortizationEngine, AmortizationScheduleItem } from "./amortization-engine";

export interface CalculationOrchestratorResult {
  calculationId?: string;
  calculationNumber: string;
  status: "OK" | "OVER";
  isEligible: boolean;
  reasons: string[];
  warnings: string[];
  calculationMethod: CalculationMethod;
  input: {
    productId: string;
    paymentOfficeId?: string | null;
    birthDate: string;
    netSalary: number;
    otherIncome: number;
    requestedPrincipal: number;
    tenorMonths: number;
    calculationMethod: CalculationMethod;
    settlementPayoff?: number;
    otherFee?: number;
    otherDeductions?: number;
  };
  result: {
    maximumPrincipal: number;
    installment: number;
    dbr: number;
    remainingSalary: number;
    totalFees: number;
    flaggingFee: number;
    payoffAmount: number;
    netDisbursement: number;
  };
  breakdown: {
    age: {
      currentYears: number;
      currentMonths: number;
      currentDays: number;
      maturityYears: number;
      maturityMonths: number;
      maturityDays: number;
    };
    tenor: {
      requestedMonths: number;
      insuranceYears: number;
      maxTenorByAgeMonths: number;
      maxTenorProductMonths: number;
      maxTenorFinalMonths: number;
    };
    principal: {
      requested: number;
      capacityRaw: number;
      capacityRounded: number;
      productMax: number;
      finalMax: number;
    };
    installment: {
      monthlyInstallment: number;
      principalPortion: number;
      interestPortion: number;
      annualRate: number;
      monthlyRate: number;
    };
  };
  insurance: {
    rate: number;
    currentAgeRate: number | null;
    nextAgeRate: number | null;
    premium: number;
    fronting: number;
    reserve: number;
    totalInsuranceCharge: number;
  };
  fees: {
    admin: number;
    adminRate: number;
    provision: number;
    provisionRate: number;
    verification: number;
    flagging: number;
    installmentDeduction: number;
    installmentDeductionPeriods: number;
    otherFee: number;
    settlementPayoff: number;
    otherDeductions: number;
    totalFees: number;
    totalDeductions: number;
  };
  schedule: Array<{
    period: number;
    paymentDate: string;
    openingBalance: number;
    principalPortion: number;
    interestPortion: number;
    installment: number;
    closingBalance: number;
  }>;
  versions: {
    businessRule: string;
    parameter: string;
    creditParameterVersion: string;
    feeParameterVersion: string;
  };
}

export class CreditCalculationOrchestrator {
  /**
   * Executes end-to-end credit calculation orchestration:
   * 1. Validates input
   * 2. Executes method strategy (FLAT vs ANNUITY)
   * 3. Calculates insurance premiums & charges
   * 4. Calculates fees, deductions, and net disbursement
   * 5. Calculates maximum capacity & age limits
   * 6. Evaluates eligibility rules (all reasons aggregated)
   * 7. Generates amortization schedule
   * 8. Persists calculation snapshot
   */
  static async execute(
    rawInput: unknown,
    userId?: string
  ): Promise<CalculationOrchestratorResult> {
    // 1. Validation & Input Loading
    const validated: ValidatedCalculationInput =
      await CalculationInputValidator.validateOrThrow(rawInput);

    const {
      product,
      creditParameter,
      feeParameter,
      requestedPrincipal: principal,
      tenor,
      netSalary: monthlySalary,
      birthDate,
      calculationDate,
      method,
      settlementPayoff,
      otherFee,
      otherDeductions,
    } = validated;

    const annualMarginRate = Percentage.fromDecimal(
      creditParameter.flatAnnualRate.toString()
    );
    const maxDbr = Percentage.fromDecimal(
      creditParameter.maximumDbr.toString()
    );
    const maxProductPrincipal = Money.from(
      creditParameter.maximumPrincipal.toString()
    );
    const maxProductTenorMonths = creditParameter.maximumTenorMonths;
    const principalRoundingIncrement = Money.from(
      creditParameter.principalRoundingIncrement.toString()
    );

    // 2. Execute Method Calculation Strategy (FLAT or ANNUITY)
    const strategy =
      method === "ANNUITY"
        ? new AnnuityCalculationStrategy()
        : new FlatCalculationStrategy();

    const strategyResult = strategy.calculate({
      principal,
      tenor,
      monthlySalary,
      annualMarginRate,
      maxDbr,
      maxProductPrincipal,
      principalRoundingIncrement,
    });

    // 3. Insurance Calculation (Dual age lookup, ceiling tenor, official rates)
    const insuranceResult = await InsuranceCalculationService.calculate({
      productId: product.id,
      principal,
      tenor,
      age: validated.ageAtCalculation.years,
      feeParameter,
    });

    // 4. Fee & Deductions Calculation
    const feeResult = await FeeCalculationService.calculate({
      productId: product.id,
      principal,
      monthlyInstallment: strategyResult.installment.monthlyInstallment,
      insuranceCharge: insuranceResult.premium,
      paymentOfficeId: validated.paymentOffice?.id || null,
      installmentDeductionPeriods: creditParameter.installmentDeductionPeriods,
      settlementPayoff,
      otherFee,
      otherDeductions,
      feeParameter,
    });

    // 5. Maximum Principal & Age Capacity Evaluation
    const maxPrincipalResult = MaximumPrincipalService.calculate({
      monthlySalary,
      birthDate,
      calculationDate,
      method,
      requestedTenorMonths: tenor.months,
      annualMarginRate,
      maxDbr,
      maxProductTenorMonths,
      maxProductPrincipal,
      principalRoundingIncrement,
      requestedPrincipal: principal,
      maxEffectiveAgeYears: creditParameter.maximumAgeYears,
      maxEffectiveAgeMonths: creditParameter.maximumAgeMonths,
    });

    // 6. Eligibility Engine (Aggregates all reasons without stopping early)
    const eligibilityResult = EligibilityService.evaluate({
      birthDate,
      calculationDate,
      requestedPrincipal: principal,
      requestedTenor: tenor,
      monthlySalary,
      monthlyInstallment: strategyResult.installment.monthlyInstallment,
      maxDbr,
      maxProductTenorMonths,
      maxProductPrincipal,
      maxPrincipalCapacity: maxPrincipalResult.roundedMaxPrincipalCapacity,
      netDisbursement: feeResult.netDisbursement,
      maxEffectiveAgeYears: creditParameter.maximumAgeYears,
      maxEffectiveAgeMonths: creditParameter.maximumAgeMonths,
    });

    // 7. Amortization Schedule Generation
    const scheduleSummary = AmortizationEngine.generateSchedule({
      principal,
      tenor,
      method,
      annualMarginRate,
      startDate: calculationDate,
    });

    // 8. Generate Unique Calculation Number
    const calcNumber = `CALC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 9. Format response payload
    const result: CalculationOrchestratorResult = {
      calculationNumber: calcNumber,
      status: eligibilityResult.status,
      isEligible: eligibilityResult.isEligible,
      reasons: eligibilityResult.reasons,
      warnings: eligibilityResult.warnings,
      calculationMethod: method,
      input: {
        productId: product.id,
        paymentOfficeId: validated.paymentOffice?.id || null,
        birthDate: birthDate.toISOString().split("T")[0],
        netSalary: monthlySalary.toNumber(),
        otherIncome: validated.otherIncome ? validated.otherIncome.toNumber() : 0,
        requestedPrincipal: principal.toNumber(),
        tenorMonths: tenor.months,
        calculationMethod: method,
        settlementPayoff: settlementPayoff ? settlementPayoff.toNumber() : 0,
        otherFee: otherFee ? otherFee.toNumber() : 0,
        otherDeductions: otherDeductions ? otherDeductions.toNumber() : 0,
      },
      result: {
        maximumPrincipal: maxPrincipalResult.maxPrincipalFinal.toNumber(),
        installment: strategyResult.installment.monthlyInstallment.round(2).toNumber(),
        dbr: eligibilityResult.dbr.toDecimal(),
        remainingSalary: eligibilityResult.remainingSalary.round(2).toNumber(),
        totalFees: feeResult.totalFees.round(2).toNumber(),
        flaggingFee: feeResult.flaggingFee.toNumber(),
        payoffAmount: settlementPayoff ? settlementPayoff.toNumber() : 0,
        netDisbursement: feeResult.netDisbursement.round(2).toNumber(),
      },
      breakdown: {
        age: {
          currentYears: eligibilityResult.ageAtCalculation.years,
          currentMonths: eligibilityResult.ageAtCalculation.months,
          currentDays: eligibilityResult.ageAtCalculation.days,
          maturityYears: eligibilityResult.ageAtMaturity.years,
          maturityMonths: eligibilityResult.ageAtMaturity.months,
          maturityDays: eligibilityResult.ageAtMaturity.days ?? 0,
        },
        tenor: {
          requestedMonths: tenor.months,
          insuranceYears: insuranceResult.tenorYears,
          maxTenorByAgeMonths: maxPrincipalResult.maxTenorAgeMonths,
          maxTenorProductMonths: maxProductTenorMonths,
          maxTenorFinalMonths: maxPrincipalResult.maxTenorFinalMonths,
        },
        principal: {
          requested: principal.toNumber(),
          capacityRaw: strategyResult.rawMaxPrincipalCapacity.round(2).toNumber(),
          capacityRounded: strategyResult.roundedMaxPrincipalCapacity.toNumber(),
          productMax: maxProductPrincipal.toNumber(),
          finalMax: maxPrincipalResult.maxPrincipalFinal.toNumber(),
        },
        installment: {
          monthlyInstallment: strategyResult.installment.monthlyInstallment.round(2).toNumber(),
          principalPortion: strategyResult.installment.principalPortion.round(2).toNumber(),
          interestPortion: strategyResult.installment.interestPortion.round(2).toNumber(),
          annualRate: annualMarginRate.toDecimal(),
          monthlyRate: strategyResult.interestRate.monthlyRate.toDecimal(),
        },
      },
      insurance: {
        rate: insuranceResult.selectedPremiumRate.toDecimal(),
        currentAgeRate: insuranceResult.currentAgeRate?.toDecimal() ?? null,
        nextAgeRate: insuranceResult.nextAgeRate?.toDecimal() ?? null,
        premium: insuranceResult.premium.premiumAmount.round(2).toNumber(),
        fronting: insuranceResult.premium.frontingAmount.round(2).toNumber(),
        reserve: insuranceResult.premium.reserveAmount.round(2).toNumber(),
        totalInsuranceCharge: insuranceResult.premium.totalInsuranceCharge.round(2).toNumber(),
      },
      fees: {
        admin: feeResult.adminFee.round(2).toNumber(),
        adminRate: feeResult.adminRate.toDecimal(),
        provision: feeResult.provisionFee.round(2).toNumber(),
        provisionRate: feeResult.provisionRate.toDecimal(),
        verification: feeResult.verificationFee.toNumber(),
        flagging: feeResult.flaggingFee.toNumber(),
        installmentDeduction: feeResult.installmentDeduction.round(2).toNumber(),
        installmentDeductionPeriods: feeResult.installmentDeductionPeriods,
        otherFee: feeResult.otherFee.toNumber(),
        settlementPayoff: feeResult.settlementPayoff.toNumber(),
        otherDeductions: feeResult.otherDeductions.toNumber(),
        totalFees: feeResult.totalFees.round(2).toNumber(),
        totalDeductions: feeResult.totalDeductions.round(2).toNumber(),
      },
      schedule: scheduleSummary.items.map((item) => ({
        period: item.period,
        paymentDate: item.paymentDate,
        openingBalance: item.openingBalance.round(2).toNumber(),
        principalPortion: item.principalPortion.round(2).toNumber(),
        interestPortion: item.interestPortion.round(2).toNumber(),
        installment: item.installment.round(2).toNumber(),
        closingBalance: item.closingBalance.round(2).toNumber(),
      })),
      versions: {
        businessRule: "BR-1.0",
        parameter: creditParameter.version,
        creditParameterVersion: creditParameter.version,
        feeParameterVersion: feeParameter.version,
      },
    };

    // 10. Persist Calculation Record in Database
    try {
      const savedCalc = await db.calculation.create({
        data: {
          calculationNumber: calcNumber,
          createdBy: userId || null,
          bprId: product.bprId,
          productId: product.id,
          paymentOfficeId: validated.paymentOffice?.id || null,
          calculationMethod: method,
          businessRuleVersion: "BR-1.0",
          parameterVersion: creditParameter.version,
          inputSnapshot: result.input as object,
          resultSnapshot: {
            result: result.result,
            breakdown: result.breakdown,
            insurance: result.insurance,
            fees: result.fees,
            reasons: result.reasons,
          } as object,
          status: result.status,
        },
      });

      result.calculationId = savedCalc.id;
    } catch (saveErr) {
      console.error("[CreditCalculationOrchestrator] Warning: Failed to persist calculation record:", saveErr);
    }

    return result;
  }
}
