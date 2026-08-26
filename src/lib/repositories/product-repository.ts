import { db } from "@/lib/db";
import { Product, Prisma } from "@prisma/client";

export interface ProductWithRelations extends Product {
  bpr?: {
    id: string;
    code: string;
    name: string;
  };
  _count?: {
    creditParameters: number;
    feeParameters: number;
    insuranceRates: number;
    parameterVersions: number;
    simulations: number;
    calculations: number;
  };
}

export interface CreateProductInput {
  bprId: string;
  code: string;
  name: string;
  description?: string | null;
  status?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  status?: string;
}

export interface ProductListFilter {
  bprId?: string;
  status?: string;
  search?: string;
  includeDeleted?: boolean;
}

export class ProductRepository {
  /**
   * Lists products with filtering and counts.
   */
  static async list(
    filter: ProductListFilter = {}
  ): Promise<ProductWithRelations[]> {
    const where: Prisma.ProductWhereInput = {};

    if (!filter.includeDeleted) {
      where.deletedAt = null;
    }
    if (filter.bprId) {
      where.bprId = filter.bprId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    return db.product.findMany({
      where,
      orderBy: [{ bprId: "asc" }, { code: "asc" }],
      include: {
        bpr: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            creditParameters: true,
            feeParameters: true,
            insuranceRates: true,
            parameterVersions: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Finds a product by ID with full relations.
   */
  static async findById(
    id: string,
    includeDeleted = false
  ): Promise<ProductWithRelations | null> {
    const where: Prisma.ProductWhereInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.product.findFirst({
      where,
      include: {
        bpr: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            creditParameters: true,
            feeParameters: true,
            insuranceRates: true,
            parameterVersions: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Finds a product by BPR ID and product code.
   */
  static async findByBprAndCode(
    bprId: string,
    code: string,
    includeDeleted = false
  ): Promise<ProductWithRelations | null> {
    const where: Prisma.ProductWhereInput = {
      bprId,
      code: code.trim().toUpperCase(),
    };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.product.findFirst({
      where,
      include: {
        bpr: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            creditParameters: true,
            feeParameters: true,
            insuranceRates: true,
            parameterVersions: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Creates a new Product.
   */
  static async create(
    input: CreateProductInput
  ): Promise<ProductWithRelations> {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    return db.product.create({
      data: {
        bprId: input.bprId,
        code,
        name,
        description: input.description?.trim() || null,
        status: input.status || "ACTIVE",
      },
      include: {
        bpr: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            creditParameters: true,
            feeParameters: true,
            insuranceRates: true,
            parameterVersions: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Updates an existing Product.
   */
  static async update(
    id: string,
    input: UpdateProductInput
  ): Promise<ProductWithRelations> {
    const data: Prisma.ProductUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.status !== undefined) data.status = input.status;

    return db.product.update({
      where: { id },
      data,
      include: {
        bpr: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            creditParameters: true,
            feeParameters: true,
            insuranceRates: true,
            parameterVersions: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Soft deletes a Product.
   */
  static async softDelete(id: string): Promise<ProductWithRelations> {
    return db.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
      },
      include: {
        bpr: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }
}
