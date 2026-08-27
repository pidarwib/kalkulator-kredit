import { db } from "@/lib/db";
import { FeeParameter, Prisma } from "@prisma/client";

export interface FeeParameterWithRelations extends FeeParameter {
  product?: {
    id: string;
    code: string;
    name: string;
    bprId: string;
  };
  paymentOffice?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface CreateFeeParameterVersionInput {
  productId: string;
  paymentOfficeId?: string | null;
  adminRate?: number | string | Prisma.Decimal;
  provisionRate?: number | string | Prisma.Decimal;
  verificationFee?: number | string | Prisma.Decimal;
  flaggingFee?: number | string | Prisma.Decimal;
  frontingRate?: number | string | Prisma.Decimal;
  reserveRate?: number | string | Prisma.Decimal;
  effectiveFrom: Date | string;
  version?: string;
  description?: string;
  createdBy?: string;
}

export class FeeParameterRepository {
  /**
   * Finds the active FeeParameter for a product and optional payment office.
   * If paymentOfficeId is provided and no specific rule exists, falls back to the product default (paymentOfficeId: null).
   */
  static async findActive(
    productId: string,
    paymentOfficeId?: string | null
  ): Promise<FeeParameterWithRelations | null> {
    if (paymentOfficeId) {
      const specific = await db.feeParameter.findFirst({
        where: {
          productId,
          paymentOfficeId,
          isActive: true,
        },
        orderBy: { effectiveFrom: "desc" },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              bprId: true,
            },
          },
          paymentOffice: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      if (specific) return specific;
    }

    // Fallback to default product fee parameter (paymentOfficeId: null)
    return db.feeParameter.findFirst({
      where: {
        productId,
        paymentOfficeId: null,
        isActive: true,
      },
      orderBy: { effectiveFrom: "desc" },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            bprId: true,
          },
        },
        paymentOffice: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Lists all historical and active FeeParameter versions for a product.
   */
  static async listVersions(
    productId: string,
    paymentOfficeId?: string | null
  ): Promise<FeeParameterWithRelations[]> {
    const where: Prisma.FeeParameterWhereInput = { productId };
    if (paymentOfficeId !== undefined) {
      where.paymentOfficeId = paymentOfficeId;
    }

    return db.feeParameter.findMany({
      where,
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            bprId: true,
          },
        },
        paymentOffice: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Creates a new FeeParameter version.
   * CRITICAL: Preserves historical records, deactivates previous active version,
   * sets effectiveTo, and records the new active parameter.
   */
  static async createNewVersion(
    input: CreateFeeParameterVersionInput
  ): Promise<{
    newFeeParameter: FeeParameterWithRelations;
    previousFeeParameter: FeeParameter | null;
  }> {
    const effectiveFromDate =
      typeof input.effectiveFrom === "string"
        ? new Date(input.effectiveFrom)
        : input.effectiveFrom;

    const adminRate =
      input.adminRate !== undefined
        ? new Prisma.Decimal(input.adminRate.toString())
        : new Prisma.Decimal("0");
    const provisionRate =
      input.provisionRate !== undefined
        ? new Prisma.Decimal(input.provisionRate.toString())
        : new Prisma.Decimal("0");
    const verificationFee =
      input.verificationFee !== undefined
        ? new Prisma.Decimal(input.verificationFee.toString())
        : new Prisma.Decimal("1500000");
    const flaggingFee =
      input.flaggingFee !== undefined
        ? new Prisma.Decimal(input.flaggingFee.toString())
        : new Prisma.Decimal("38000");
    const frontingRate =
      input.frontingRate !== undefined
        ? new Prisma.Decimal(input.frontingRate.toString())
        : new Prisma.Decimal("0");
    const reserveRate =
      input.reserveRate !== undefined
        ? new Prisma.Decimal(input.reserveRate.toString())
        : new Prisma.Decimal("0");

    const targetPaymentOfficeId = input.paymentOfficeId || null;

    return db.$transaction(async (tx) => {
      // 1. Fetch current active fee parameter for this product + paymentOffice combination
      const activeParam = await tx.feeParameter.findFirst({
        where: {
          productId: input.productId,
          paymentOfficeId: targetPaymentOfficeId,
          isActive: true,
        },
        orderBy: { effectiveFrom: "desc" },
      });

      // Determine next version label if not provided
      let nextVersion = input.version;
      if (!nextVersion) {
        const count = await tx.feeParameter.count({
          where: {
            productId: input.productId,
            paymentOfficeId: targetPaymentOfficeId,
          },
        });
        nextVersion = `v${count + 1}`;
      }

      // 2. Deactivate previous active version (DO NOT OVERWRITE)
      if (activeParam) {
        await tx.feeParameter.update({
          where: { id: activeParam.id },
          data: {
            isActive: false,
            effectiveTo: effectiveFromDate,
          },
        });
      }

      // 3. Create new active FeeParameter record
      const created = await tx.feeParameter.create({
        data: {
          productId: input.productId,
          paymentOfficeId: targetPaymentOfficeId,
          adminRate,
          provisionRate,
          verificationFee,
          flaggingFee,
          frontingRate,
          reserveRate,
          effectiveFrom: effectiveFromDate,
          version: nextVersion,
          isActive: true,
          createdBy: input.createdBy || null,
        },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              bprId: true,
            },
          },
          paymentOffice: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      // 4. Create new ParameterVersion audit tracking record
      await tx.parameterVersion.create({
        data: {
          productId: input.productId,
          version: `FEE-${nextVersion}${
            targetPaymentOfficeId ? `-${targetPaymentOfficeId.slice(0, 8)}` : ""
          }`,
          description:
            input.description ||
            `Fee parameter ${nextVersion}${
              targetPaymentOfficeId ? ` (Office: ${targetPaymentOfficeId})` : ""
            }`,
          effectiveFrom: effectiveFromDate,
          status: "ACTIVE",
          createdBy: input.createdBy || null,
        },
      });

      return {
        newFeeParameter: created,
        previousFeeParameter: activeParam,
      };
    });
  }
}
