import { Money, Percentage, Tenor, InterestRate, Installment, CalculationMethod } from "@/lib/domain";

export interface CalculationStrategyInput {
  principal: Money | number | string;
  tenor: Tenor | number;
  monthlySalary: Money | number | string;
  annualMarginRate?: Percentage | number | string;
  maxDbr?: Percentage | number | string;
  maxProductPrincipal?: Money | number | string;
  principalRoundingIncrement?: Money | number | string;
}

export interface CalculationStrategyResult {
  method: CalculationMethod;
  interestRate: InterestRate;
  installment: Installment;
  dbr: Percentage;
  maxDbr: Percentage;
  maxInstallment: Money;
  remainingSalary: Money;
  rawMaxPrincipalCapacity: Money;
  roundedMaxPrincipalCapacity: Money;
  maxProductPrincipal: Money;
  maxPrincipalFinal: Money;
  isDbrValid: boolean;
  isPrincipalValid: boolean;
}

export interface ICalculationStrategy {
  readonly method: CalculationMethod;
  calculate(input: CalculationStrategyInput): CalculationStrategyResult;
}
