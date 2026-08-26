import { db } from "@/lib/db";
import { Branch, Prisma } from "@prisma/client";

export interface BranchWithRelations extends Branch {
  bpr?: {
    id: string;
    code: string;
    name: string;
  };
  _count?: {
    paymentOffices: number;
    users: number;
    simulations: number;
  };
}

export interface CreateBranchInput {
  bprId: string;
  code: string;
  name: string;
  address?: string | null;
  status?: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string | null;
  status?: string;
}

export interface BranchListFilter {
  bprId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

export interface PaginatedBranches {
  data: BranchWithRelations[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class BranchRepository {
  /**
   * Lists branches with pagination and filters.
   */
  static async list(filter: BranchListFilter = {}): Promise<PaginatedBranches> {
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.BranchWhereInput = {};

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
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      db.branch.findMany({
        where,
        skip,
        take: pageSize,
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
              paymentOffices: true,
              users: true,
              simulations: true,
            },
          },
        },
      }),
      db.branch.count({ where }),
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
   * Finds a branch by ID with relations.
   */
  static async findById(
    id: string,
    includeDeleted = false
  ): Promise<BranchWithRelations | null> {
    const where: Prisma.BranchWhereInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.branch.findFirst({
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
            paymentOffices: true,
            users: true,
            simulations: true,
          },
        },
      },
    });
  }

  /**
   * Finds a branch by BPR ID and code.
   */
  static async findByBprAndCode(
    bprId: string,
    code: string,
    includeDeleted = false
  ): Promise<BranchWithRelations | null> {
    const where: Prisma.BranchWhereInput = {
      bprId,
      code: code.trim().toUpperCase(),
    };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.branch.findFirst({
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
            paymentOffices: true,
            users: true,
            simulations: true,
          },
        },
      },
    });
  }

  /**
   * Creates a new Branch.
   */
  static async create(input: CreateBranchInput): Promise<BranchWithRelations> {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    return db.branch.create({
      data: {
        bprId: input.bprId,
        code,
        name,
        address: input.address?.trim() || null,
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
            paymentOffices: true,
            users: true,
            simulations: true,
          },
        },
      },
    });
  }

  /**
   * Updates an existing Branch.
   */
  static async update(
    id: string,
    input: UpdateBranchInput
  ): Promise<BranchWithRelations> {
    const data: Prisma.BranchUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.address !== undefined) data.address = input.address?.trim() || null;
    if (input.status !== undefined) data.status = input.status;

    return db.branch.update({
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
            paymentOffices: true,
            users: true,
            simulations: true,
          },
        },
      },
    });
  }

  /**
   * Soft deletes a Branch.
   */
  static async softDelete(id: string): Promise<BranchWithRelations> {
    return db.branch.update({
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
