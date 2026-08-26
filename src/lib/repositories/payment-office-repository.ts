import { db } from "@/lib/db";
import { PaymentOffice, Prisma } from "@prisma/client";

export interface PaymentOfficeWithRelations extends PaymentOffice {
  bpr?: {
    id: string;
    code: string;
    name: string;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  } | null;
  _count?: {
    feeParameters: number;
    simulations: number;
    calculations: number;
  };
}

export interface CreatePaymentOfficeInput {
  bprId: string;
  branchId?: string | null;
  code: string;
  name: string;
  type?: string;
  status?: string;
}

export interface UpdatePaymentOfficeInput {
  branchId?: string | null;
  name?: string;
  type?: string;
  status?: string;
}

export interface PaymentOfficeListFilter {
  bprId?: string;
  branchId?: string;
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

export interface PaginatedPaymentOffices {
  data: PaymentOfficeWithRelations[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class PaymentOfficeRepository {
  /**
   * Lists payment offices with pagination and filters.
   */
  static async list(
    filter: PaymentOfficeListFilter = {}
  ): Promise<PaginatedPaymentOffices> {
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentOfficeWhereInput = {};

    if (!filter.includeDeleted) {
      where.deletedAt = null;
    }
    if (filter.bprId) {
      where.bprId = filter.bprId;
    }
    if (filter.branchId) {
      where.branchId = filter.branchId;
    }
    if (filter.type) {
      where.type = filter.type;
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

    const [data, total] = await Promise.all([
      db.paymentOffice.findMany({
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
          branch: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: {
              feeParameters: true,
              simulations: true,
              calculations: true,
            },
          },
        },
      }),
      db.paymentOffice.count({ where }),
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
   * Finds a payment office by ID.
   */
  static async findById(
    id: string,
    includeDeleted = false
  ): Promise<PaymentOfficeWithRelations | null> {
    const where: Prisma.PaymentOfficeWhereInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.paymentOffice.findFirst({
      where,
      include: {
        bpr: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            feeParameters: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Finds a payment office by BPR ID and code.
   */
  static async findByBprAndCode(
    bprId: string,
    code: string,
    includeDeleted = false
  ): Promise<PaymentOfficeWithRelations | null> {
    const where: Prisma.PaymentOfficeWhereInput = {
      bprId,
      code: code.trim().toUpperCase(),
    };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return db.paymentOffice.findFirst({
      where,
      include: {
        bpr: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            feeParameters: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Creates a new Payment Office.
   */
  static async create(
    input: CreatePaymentOfficeInput
  ): Promise<PaymentOfficeWithRelations> {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    return db.paymentOffice.create({
      data: {
        bprId: input.bprId,
        branchId: input.branchId || null,
        code,
        name,
        type: input.type || "POS",
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
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            feeParameters: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Updates an existing Payment Office.
   */
  static async update(
    id: string,
    input: UpdatePaymentOfficeInput
  ): Promise<PaymentOfficeWithRelations> {
    const data: Prisma.PaymentOfficeUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) data.status = input.status;
    if (input.branchId !== undefined) {
      if (input.branchId === null) {
        data.branch = { disconnect: true };
      } else {
        data.branch = { connect: { id: input.branchId } };
      }
    }

    return db.paymentOffice.update({
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
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            feeParameters: true,
            simulations: true,
            calculations: true,
          },
        },
      },
    });
  }

  /**
   * Soft deletes a Payment Office.
   */
  static async softDelete(id: string): Promise<PaymentOfficeWithRelations> {
    return db.paymentOffice.update({
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
        branch: {
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
