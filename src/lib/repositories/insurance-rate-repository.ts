import { db } from "@/lib/db";
import { InsuranceRate, Prisma } from "@prisma/client";

export interface InsuranceRateItemInput {
  age: number;
  tenorYears: number;
  premiumRate: number | string | Prisma.Decimal;
}

export interface ImportInsuranceRatesInput {
  productId: string;
  rates: InsuranceRateItemInput[];
  version?: string;
  effectiveFrom?: Date | string;
  description?: string;
  createdBy?: string;
}

export interface InsuranceRateListFilter {
  productId: string;
  age?: number;
  tenorYears?: number;
  version?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedInsuranceRates {
  data: InsuranceRate[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class InsuranceRateRepository {
  /**
   * Lists insurance rates with pagination and filter for a given product.
   */
  static async list(
    filter: InsuranceRateListFilter
  ): Promise<PaginatedInsuranceRates> {
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(500, Math.max(1, filter.pageSize || 50));
    const skip = (page - 1) * pageSize;

    const where: Prisma.InsuranceRateWhereInput = {
      productId: filter.productId,
    };

    if (filter.age !== undefined) {
      where.age = filter.age;
    }
    if (filter.tenorYears !== undefined) {
      where.tenorYears = filter.tenorYears;
    }
    if (filter.version !== undefined) {
      where.version = filter.version;
    }
    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    const [data, total] = await Promise.all([
      db.insuranceRate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ version: "desc" }, { age: "asc" }, { tenorYears: "asc" }],
      }),
      db.insuranceRate.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Looks up an exact insurance rate for product, age, and tenor in years.
   * STRICT: Missing rate returns null (caller will return 404 error - no AI estimation).
   */
  static async lookup(
    productId: string,
    age: number,
    tenorYears: number,
    version?: string
  ): Promise<InsuranceRate | null> {
    const where: Prisma.InsuranceRateWhereInput = {
      productId,
      age,
      tenorYears,
    };

    if (version) {
      where.version = version;
    } else {
      where.isActive = true;
    }

    return db.insuranceRate.findFirst({
      where,
      orderBy: { effectiveFrom: "desc" },
    });
  }

  /**
   * Performs the dual lookup (Current Age vs Next Age) and returns the higher rate
   * per BUSINESS_RULES.md Section 25.
   */
  static async lookupMaxAgeRate(
    productId: string,
    currentAge: number,
    tenorYears: number
  ): Promise<{
    selectedRate: Prisma.Decimal;
    currentAgeRate: InsuranceRate | null;
    nextAgeRate: InsuranceRate | null;
  } | null> {
    const [rate1, rate2] = await Promise.all([
      this.lookup(productId, currentAge, tenorYears),
      this.lookup(productId, currentAge + 1, tenorYears),
    ]);

    if (!rate1 && !rate2) {
      return null;
    }

    const val1 = rate1 ? Number(rate1.premiumRate) : -1;
    const val2 = rate2 ? Number(rate2.premiumRate) : -1;

    const maxVal = Math.max(val1, val2);
    if (maxVal < 0) return null;

    return {
      selectedRate: new Prisma.Decimal(maxVal.toString()),
      currentAgeRate: rate1,
      nextAgeRate: rate2,
    };
  }

  /**
   * Creates a new version of Insurance Rates in batch.
   * CRITICAL: Preserves historical records, deactivates previous active version,
   * sets effectiveTo, and records the new active rates.
   */
  static async createVersion(
    input: ImportInsuranceRatesInput
  ): Promise<{ count: number; version: string }> {
    const effectiveFromDate =
      typeof input.effectiveFrom === "string"
        ? new Date(input.effectiveFrom)
        : input.effectiveFrom || new Date();

    return db.$transaction(async (tx) => {
      // 1. Determine next version label
      let nextVersion = input.version;
      if (!nextVersion) {
        const currentActive = await tx.insuranceRate.findFirst({
          where: { productId: input.productId, isActive: true },
          select: { version: true },
        });

        if (currentActive?.version) {
          const match = currentActive.version.match(/^v(\d+)$/);
          if (match) {
            nextVersion = `v${parseInt(match[1], 10) + 1}`;
          } else {
            nextVersion = `v2`;
          }
        } else {
          nextVersion = "v1";
        }
      }

      // 2. Deactivate previous active version (DO NOT OVERWRITE)
      await tx.insuranceRate.updateMany({
        where: {
          productId: input.productId,
          isActive: true,
        },
        data: {
          isActive: false,
          effectiveTo: effectiveFromDate,
        },
      });

      // 3. Insert new batch of insurance rates
      const records = input.rates.map((r) => ({
        productId: input.productId,
        age: r.age,
        tenorYears: r.tenorYears,
        premiumRate: new Prisma.Decimal(r.premiumRate.toString()),
        effectiveFrom: effectiveFromDate,
        version: nextVersion,
        isActive: true,
      }));

      const created = await tx.insuranceRate.createMany({
        data: records,
      });

      // 4. Create new ParameterVersion tracking record
      await tx.parameterVersion.create({
        data: {
          productId: input.productId,
          version: `INS-${nextVersion}`,
          description:
            input.description ||
            `Insurance rates version ${nextVersion} (${records.length} matrix cells)`,
          effectiveFrom: effectiveFromDate,
          status: "ACTIVE",
          createdBy: input.createdBy || null,
        },
      });

      return {
        count: created.count,
        version: nextVersion,
      };
    });
  }
}
