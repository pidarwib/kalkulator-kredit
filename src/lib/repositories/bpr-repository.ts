import { db } from "@/lib/db";
import { Bpr, Prisma } from "@prisma/client";

export interface BprWithCounts extends Bpr {
  _count?: {
    branches: number;
    paymentOffices: number;
    products: number;
    users: number;
    simulations: number;
  };
}

export interface CreateBprInput {
  code: string;
  name: string;
  status?: string;
}

export interface UpdateBprInput {
  name?: string;
  status?: string;
}

export interface BprListFilter {
  status?: string;
  search?: string;
  includeDeleted?: boolean;
}

export class BprRepository {
  /**
   * Lists all BPRs with related counts.
   */
  static async list(filter: BprListFilter = {}): Promise<BprWithCounts[]> {
    const where: Prisma.BprWhereInput = {};

    if (!filter.includeDeleted) {
      where.deletedAt = null;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ];
    }

    return db.bpr.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            branches: true,
            paymentOffices: true,
            products: true,
            users: true,
            simulations: true,
          },
        },
      },
    });
  }

  /**
   * Finds a BPR by ID.
   */
  static async findById(
    id: string,
    includeDeleted = false
  ): Promise<BprWithCounts | null> {
    const where: Prisma.BprWhereInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.bpr.findFirst({
      where,
      include: {
        _count: {
          select: {
            branches: true,
            paymentOffices: true,
            products: true,
            users: true,
            simulations: true,
          },
        },
      },
    });
  }

  /**
   * Finds a BPR by code.
   */
  static async findByCode(
    code: string,
    includeDeleted = false
  ): Promise<BprWithCounts | null> {
    const where: Prisma.BprWhereInput = {
      code: code.trim().toUpperCase(),
    };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.bpr.findFirst({
      where,
      include: {
        _count: {
          select: {
            branches: true,
            paymentOffices: true,
            products: true,
            users: true,
            simulations: true,
          },
        },
      },
    });
  }

  /**
   * Creates a new BPR.
   */
  static async create(input: CreateBprInput): Promise<Bpr> {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    return db.bpr.create({
      data: {
        code,
        name,
        status: input.status || "ACTIVE",
      },
    });
  }

  /**
   * Updates an existing BPR.
   */
  static async update(id: string, input: UpdateBprInput): Promise<Bpr> {
    const data: Prisma.BprUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.status !== undefined) data.status = input.status;

    return db.bpr.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft deletes a BPR.
   */
  static async softDelete(id: string): Promise<Bpr> {
    return db.bpr.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
      },
    });
  }
}
