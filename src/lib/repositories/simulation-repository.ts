import { db } from "@/lib/db";
import { Prisma, Simulation } from "@prisma/client";
import { CalculationOrchestratorResult } from "@/lib/calculation";

export interface CreateSimulationParams {
  userId: string;
  bprId: string;
  branchId?: string | null;
  paymentOfficeId?: string | null;
  productId: string;
  customerName?: string | null;
  customerNip?: string | null;
  calculationMethod: "FLAT" | "ANNUITY";
  businessRuleVersion: string;
  parameterVersion: string;
  calculationResult: CalculationOrchestratorResult;
  status?: "DRAFT" | "SAVED" | "ARCHIVED";
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class SimulationRepository {
  /**
   * Generates a collision-resistant unique simulation number.
   * Format: SIM-{timestamp}-{4-digit random}
   */
  static generateSimulationNumber(): string {
    return `SIM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  /**
   * Creates a Simulation with its related CalculationResult, AmortizationSchedule rows,
   * EligibilityReasons, and AuditLog in an atomic database transaction.
   * Rollback occurs automatically if any critical write fails.
   */
  static async createWithDetails(
    params: CreateSimulationParams
  ): Promise<Simulation> {
    const simulationNumber = this.generateSimulationNumber();
    const { calculationResult } = params;

    return await db.$transaction(async (tx) => {
      // 1. Create root Simulation record
      const simulation = await tx.simulation.create({
        data: {
          simulationNumber,
          createdBy: params.userId,
          bprId: params.bprId,
          branchId: params.branchId || null,
          paymentOfficeId: params.paymentOfficeId || null,
          productId: params.productId,
          customerName: params.customerName || null,
          customerNip: params.customerNip || null,
          calculationMethod: params.calculationMethod,
          businessRuleVersion: params.businessRuleVersion,
          parameterVersion: params.parameterVersion,
          inputSnapshot: calculationResult.input as object,
          resultSnapshot: {
            result: calculationResult.result,
            breakdown: calculationResult.breakdown,
            insurance: calculationResult.insurance,
            fees: calculationResult.fees,
            reasons: calculationResult.reasons,
            warnings: calculationResult.warnings,
          } as object,
          status: params.status || "SAVED",
        },
      });

      // 2. Create CalculationResult record
      await tx.calculationResult.create({
        data: {
          simulationId: simulation.id,
          ageCurrent: calculationResult.breakdown.age.currentYears,
          ageAtMaturity: calculationResult.breakdown.age.maturityYears,
          tenorMonths: calculationResult.input.tenorMonths,
          tenorYearsInsurance: calculationResult.breakdown.tenor.insuranceYears,
          maxTenorByAge: calculationResult.breakdown.tenor.maxTenorByAgeMonths,
          maxTenorFinal: calculationResult.breakdown.tenor.maxTenorFinalMonths,
          maxInstallment: new Prisma.Decimal(calculationResult.result.installment),
          maxPrincipalByCapacity: new Prisma.Decimal(
            calculationResult.breakdown.principal.capacityRounded
          ),
          maxPrincipalFinal: new Prisma.Decimal(
            calculationResult.result.maximumPrincipal
          ),
          requestedPrincipal: new Prisma.Decimal(
            calculationResult.input.requestedPrincipal
          ),
          installment: new Prisma.Decimal(calculationResult.result.installment),
          dbr: new Prisma.Decimal(calculationResult.result.dbr),
          remainingSalary: new Prisma.Decimal(
            calculationResult.result.remainingSalary
          ),
          insuranceRate: new Prisma.Decimal(calculationResult.insurance.rate),
          premium: new Prisma.Decimal(calculationResult.insurance.premium),
          frontingFee: new Prisma.Decimal(calculationResult.insurance.fronting),
          reserve: new Prisma.Decimal(calculationResult.insurance.reserve),
          adminFee: new Prisma.Decimal(calculationResult.fees.admin),
          provisionFee: new Prisma.Decimal(calculationResult.fees.provision),
          verificationFee: new Prisma.Decimal(calculationResult.fees.verification),
          flaggingFee: new Prisma.Decimal(calculationResult.fees.flagging),
          installmentDeduction: new Prisma.Decimal(
            calculationResult.fees.installmentDeduction
          ),
          payoffAmount: new Prisma.Decimal(calculationResult.result.payoffAmount),
          totalFees: new Prisma.Decimal(calculationResult.result.totalFees),
          netDisbursement: new Prisma.Decimal(
            calculationResult.result.netDisbursement
          ),
          eligibilityStatus: calculationResult.status,
        },
      });

      // 3. Create EligibilityReasons (if any)
      if (
        calculationResult.reasons &&
        calculationResult.reasons.length > 0
      ) {
        await tx.eligibilityReason.createMany({
          data: calculationResult.reasons.map((reason, idx) => ({
            simulationId: simulation.id,
            code: `REASON_${idx + 1}`,
            message: reason,
          })),
        });
      }

      // 4. Create AmortizationSchedule rows in batch
      if (
        calculationResult.schedule &&
        calculationResult.schedule.length > 0
      ) {
        await tx.amortizationSchedule.createMany({
          data: calculationResult.schedule.map((item) => ({
            simulationId: simulation.id,
            periodNumber: item.period,
            paymentDate: item.paymentDate ? new Date(item.paymentDate) : null,
            openingBalance: new Prisma.Decimal(item.openingBalance),
            principalPayment: new Prisma.Decimal(item.principalPortion),
            marginPayment: new Prisma.Decimal(item.interestPortion),
            installment: new Prisma.Decimal(item.installment),
            closingBalance: new Prisma.Decimal(item.closingBalance),
          })),
        });
      }

      // 5. Create AuditLog within the same atomic transaction
      await tx.auditLog.create({
        data: {
          userId: params.userId,
          action: "SIMULATION_CREATE",
          entityType: "Simulation",
          entityId: simulation.id,
          newValue: {
            simulationNumber: simulation.simulationNumber,
            productId: simulation.productId,
            requestedPrincipal: calculationResult.input.requestedPrincipal,
            tenorMonths: calculationResult.input.tenorMonths,
            method: simulation.calculationMethod,
            status: simulation.status,
            installment: calculationResult.result.installment,
            netDisbursement: calculationResult.result.netDisbursement,
          },
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });

      return simulation;
    });
  }

  /**
   * Finds a simulation by ID with full details.
   */
  static async findById(id: string) {
    return await db.simulation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
        bpr: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        paymentOffice: { select: { id: true, code: true, name: true } },
        product: { select: { id: true, code: true, name: true } },
        calculationResult: true,
        amortizationSchedules: { orderBy: { periodNumber: "asc" } },
        eligibilityReasons: true,
      },
    });
  }

  /**
   * Soft deletes a simulation record and logs the audit trail.
   */
  static async softDelete(
    id: string,
    userId: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<Simulation> {
    return await db.$transaction(async (tx) => {
      const existing = await tx.simulation.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Simulation with ID '${id}' not found.`);
      }

      const updated = await tx.simulation.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: "ARCHIVED",
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "SIMULATION_DELETE",
          entityType: "Simulation",
          entityId: id,
          oldValue: {
            status: existing.status,
            deletedAt: existing.deletedAt,
          },
          newValue: {
            status: updated.status,
            deletedAt: updated.deletedAt,
          },
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      return updated;
    });
  }

  /**
   * Sets simulation status to ARCHIVED and logs the audit trail.
   */
  static async archive(
    id: string,
    userId: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<Simulation> {
    return await db.$transaction(async (tx) => {
      const existing = await tx.simulation.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Simulation with ID '${id}' not found.`);
      }

      const updated = await tx.simulation.update({
        where: { id },
        data: {
          status: "ARCHIVED",
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "SIMULATION_ARCHIVE",
          entityType: "Simulation",
          entityId: id,
          oldValue: {
            status: existing.status,
          },
          newValue: {
            status: updated.status,
          },
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      return updated;
    });
  }

  /**
   * Lists simulations with search, filter, scoping, and pagination.
   */
  static async list(params: ListSimulationsParams = {}) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where = this.buildWhereClause(params);

    const [items, total] = await Promise.all([
      db.simulation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          bpr: { select: { id: true, code: true, name: true } },
          branch: { select: { id: true, code: true, name: true } },
          paymentOffice: { select: { id: true, code: true, name: true } },
          product: { select: { id: true, code: true, name: true } },
          calculationResult: {
            select: {
              requestedPrincipal: true,
              installment: true,
              dbr: true,
              netDisbursement: true,
              eligibilityStatus: true,
            },
          },
        },
      }),
      db.simulation.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  private static buildWhereClause(params: ListSimulationsParams): Prisma.SimulationWhereInput {
    const where: Prisma.SimulationWhereInput = {};

    if (!params.includeDeleted) {
      where.deletedAt = null;
    }

    if (params.bprId) {
      where.bprId = params.bprId;
    }

    if (params.branchId) {
      where.branchId = params.branchId;
    }

    if (params.createdBy) {
      where.createdBy = params.createdBy;
    }

    if (params.productId) {
      where.productId = params.productId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.createdFrom || params.createdTo) {
      where.createdAt = {};
      if (params.createdFrom) {
        where.createdAt.gte = new Date(params.createdFrom);
      }
      if (params.createdTo) {
        where.createdAt.lte = new Date(params.createdTo);
      }
    }

    if (params.search && params.search.trim() !== "") {
      const search = params.search.trim();
      where.OR = [
        { simulationNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerNip: { contains: search, mode: "insensitive" } },
      ];
    }

    return where;
  }
}

export interface ListSimulationsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  productId?: string;
  bprId?: string;
  branchId?: string;
  createdBy?: string;
  createdFrom?: Date | string;
  createdTo?: Date | string;
  includeDeleted?: boolean;
}

