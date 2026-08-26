import { db } from "@/lib/db";
import { CreditParameter, Prisma } from "@prisma/client";

export interface CreateCreditParameterVersionInput {
  productId: string;
  maximumAgeYears: number;
  maximumAgeMonths?: number;
  maximumTenorMonths: number;
  maximumPrincipal: number | string | Prisma.Decimal;
  maximumDbr: number | string | Prisma.Decimal;
  flatAnnualRate: number | string | Prisma.Decimal;
  flatMonthlyRate?: number | string | Prisma.Decimal;
  principalRoundingIncrement?: number | string | Prisma.Decimal;
  installmentDeductionPeriods?: number;
  effectiveFrom: Date | string;
  version?: string;
  description?: string;
  createdBy?: string;
}

export class CreditParameterRepository {
  /**
   * Finds the currently active CreditParameter for a given product.
   */
  static async findActiveByProductId(
    productId: string
  ): Promise<CreditParameter | null> {
    return db.creditParameter.findFirst({
      where: {
        productId,
        isActive: true,
      },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  /**
   * Lists all historical and active CreditParameter versions for a product.
   */
  static async listVersionsByProductId(
    productId: string
  ): Promise<CreditParameter[]> {
    return db.creditParameter.findMany({
      where: { productId },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Creates a new CreditParameter version.
   * CRITICAL: Preserves historical records, deactivates previous active version,
   * sets effectiveTo, and records the new active parameter.
   */
  static async createNewVersion(
    input: CreateCreditParameterVersionInput
  ): Promise<{
    newCreditParameter: CreditParameter;
    previousCreditParameter: CreditParameter | null;
  }> {
    const effectiveFromDate =
      typeof input.effectiveFrom === "string"
        ? new Date(input.effectiveFrom)
        : input.effectiveFrom;

    // Calculate flatMonthlyRate if not explicitly provided (flatAnnualRate / 12)
    const annualRateNum =
      typeof input.flatAnnualRate === "object"
        ? Number(input.flatAnnualRate)
        : Number(input.flatAnnualRate);
    const monthlyRate =
      input.flatMonthlyRate !== undefined
        ? new Prisma.Decimal(input.flatMonthlyRate.toString())
        : new Prisma.Decimal((annualRateNum / 12).toFixed(6));

    const principalRounding =
      input.principalRoundingIncrement !== undefined
        ? new Prisma.Decimal(input.principalRoundingIncrement.toString())
        : new Prisma.Decimal("100000");

    const maxDbr = new Prisma.Decimal(input.maximumDbr.toString());
    const flatAnnual = new Prisma.Decimal(input.flatAnnualRate.toString());
    const maxPrincipal = new Prisma.Decimal(input.maximumPrincipal.toString());

    return db.$transaction(async (tx) => {
      // 1. Fetch current active parameter
      const activeParam = await tx.creditParameter.findFirst({
        where: {
          productId: input.productId,
          isActive: true,
        },
        orderBy: { effectiveFrom: "desc" },
      });

      // Determine next version string if not provided
      let nextVersion = input.version;
      if (!nextVersion) {
        const count = await tx.creditParameter.count({
          where: { productId: input.productId },
        });
        nextVersion = `v${count + 1}`;
      }

      // 2. Deactivate previous active version (DO NOT OVERWRITE)
      if (activeParam) {
        await tx.creditParameter.update({
          where: { id: activeParam.id },
          data: {
            isActive: false,
            effectiveTo: effectiveFromDate,
          },
        });

        // Also update previous ParameterVersion record if exists
        await tx.parameterVersion.updateMany({
          where: {
            productId: input.productId,
            status: "ACTIVE",
          },
          data: {
            status: "SUPERSEDED",
            effectiveTo: effectiveFromDate,
          },
        });
      }

      // 3. Create new active CreditParameter record
      const created = await tx.creditParameter.create({
        data: {
          productId: input.productId,
          maximumAgeYears: input.maximumAgeYears,
          maximumAgeMonths: input.maximumAgeMonths || 0,
          maximumTenorMonths: input.maximumTenorMonths,
          maximumPrincipal: maxPrincipal,
          maximumDbr: maxDbr,
          flatAnnualRate: flatAnnual,
          flatMonthlyRate: monthlyRate,
          principalRoundingIncrement: principalRounding,
          installmentDeductionPeriods: input.installmentDeductionPeriods ?? 2,
          effectiveFrom: effectiveFromDate,
          version: nextVersion,
          isActive: true,
          createdBy: input.createdBy || null,
        },
      });

      // 4. Create new ParameterVersion audit tracking record
      await tx.parameterVersion.create({
        data: {
          productId: input.productId,
          version: nextVersion,
          description: input.description || `Credit parameter ${nextVersion}`,
          effectiveFrom: effectiveFromDate,
          status: "ACTIVE",
          createdBy: input.createdBy || null,
        },
      });

      return {
        newCreditParameter: created,
        previousCreditParameter: activeParam,
      };
    });
  }
}
