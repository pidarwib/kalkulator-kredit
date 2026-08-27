import { NextRequest, NextResponse } from "next/server";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  CreditCalculationOrchestrator,
  CalculationValidationError,
  MissingInsuranceRateError,
} from "@/lib/calculation";
import { SimulationRepository } from "@/lib/repositories/simulation-repository";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/simulations
 *
 * Creates and persists a formal credit simulation along with calculation results,
 * amortization schedules, and audit log entries inside an atomic database transaction.
 *
 * Permission: SIMULATION_CREATE (Super Admin, Admin, Marketing)
 * Response: 201 Created
 */
export async function POST(request: NextRequest) {
  // 1. Authentication & Permission Verification
  const auth = await requirePermission(request, "SIMULATION_CREATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST_BODY",
            message: "Request body harus berupa JSON object yang valid.",
          },
        },
        { status: 400 }
      );
    }

    const { productId, customerName, customerNip, status: inputStatus } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "CALCULATION_VALIDATION_ERROR",
            message: "Product ID wajib diisi.",
            details: { productId: "Product ID wajib diisi." },
          },
        },
        { status: 422 }
      );
    }

    // 2. Tenant Scoping: Verify product belongs to user's BPR (unless Super Admin)
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, bprId: true, name: true, status: true },
    });

    if (!product) {
      return NextResponse.json(
        {
          error: {
            code: "CALCULATION_VALIDATION_ERROR",
            message: `Produk kredit dengan ID '${productId}' tidak ditemukan.`,
            details: { productId: "Produk tidak ditemukan." },
          },
        },
        { status: 422 }
      );
    }

    if (caller.role !== "SUPER_ADMIN" && caller.bprId) {
      if (product.bprId !== caller.bprId) {
        return forbiddenResponse("Anda tidak memiliki akses ke produk BPR lain.");
      }
    }

    // 3. Execute Credit Calculation Engine
    const calculationResult = await CreditCalculationOrchestrator.execute(
      body,
      caller.id
    );

    // 4. Extract IP & User-Agent for Audit Trail
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    // 5. Persist Simulation, Result, Schedules, and Audit in Atomic Transaction
    const method = calculationResult.calculationMethod;
    const simulation = await SimulationRepository.createWithDetails({
      userId: caller.id,
      bprId: product.bprId,
      branchId: caller.branchId || null,
      paymentOfficeId: calculationResult.input.paymentOfficeId || null,
      productId: product.id,
      customerName: customerName || null,
      customerNip: customerNip || null,
      calculationMethod: method,
      businessRuleVersion: calculationResult.versions.businessRule,
      parameterVersion: calculationResult.versions.parameter,
      calculationResult,
      status: inputStatus === "DRAFT" ? "DRAFT" : "SAVED",
      ipAddress,
      userAgent,
    });

    // 6. Return Structured 201 Created Response
    return NextResponse.json(
      {
        data: {
          simulationId: simulation.id,
          simulationNumber: simulation.simulationNumber,
          status: simulation.status,
          customerName: simulation.customerName,
          customerNip: simulation.customerNip,
          calculationId: calculationResult.calculationId,
          calculationMethod: calculationResult.calculationMethod,
          input: calculationResult.input,
          result: calculationResult.result,
          breakdown: calculationResult.breakdown,
          insurance: calculationResult.insurance,
          fees: calculationResult.fees,
          versions: calculationResult.versions,
          schedule: calculationResult.schedule,
          reasons: calculationResult.reasons,
          warnings: calculationResult.warnings,
          createdAt: simulation.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CalculationValidationError) {
      return NextResponse.json(
        {
          error: {
            code: "CALCULATION_VALIDATION_ERROR",
            message: error.message,
            details: error.details,
          },
        },
        { status: 422 }
      );
    }

    if (error instanceof MissingInsuranceRateError) {
      return NextResponse.json(
        {
          error: {
            code: "INSURANCE_RATE_NOT_FOUND",
            message: error.message,
            details: {
              productId: error.productId,
              age: error.age,
              tenorYears: error.tenorYears,
            },
          },
        },
        { status: 422 }
      );
    }

    console.error("[Create Simulation API] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan internal server saat membuat simulasi.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/simulations
 *
 * Lists simulations with search, filtering, pagination, and server-side data scoping.
 *
 * Permission: SIMULATION_VIEW (Super Admin, Admin, Marketing)
 * Data Scope:
 * - MARKETING: Only own simulations (createdBy = caller.id)
 * - ADMIN: Simulations within caller's BPR (bprId = caller.bprId)
 * - SUPER_ADMIN: All simulations across all BPRs
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "SIMULATION_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1", 10) || 1;
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10) || 20;
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const productId = searchParams.get("productId") || undefined;
  const createdFrom = searchParams.get("createdFrom") || undefined;
  const createdTo = searchParams.get("createdTo") || undefined;

  let bprId: string | undefined = undefined;
  let branchId: string | undefined = undefined;
  let createdBy: string | undefined = undefined;

  if (caller.role === "MARKETING") {
    // Marketing is strictly scoped to own simulations
    createdBy = caller.id;
    bprId = caller.bprId || undefined;
  } else if (caller.role === "ADMIN") {
    // Admin is scoped to their BPR
    bprId = caller.bprId || undefined;
    branchId = caller.branchId || searchParams.get("branchId") || undefined;
    createdBy = searchParams.get("createdBy") || undefined;
  } else if (caller.role === "SUPER_ADMIN") {
    // Super admin can filter across all scopes
    bprId = searchParams.get("bprId") || undefined;
    branchId = searchParams.get("branchId") || undefined;
    createdBy = searchParams.get("createdBy") || undefined;
  }

  try {
    const result = await SimulationRepository.list({
      page,
      pageSize,
      search,
      status,
      productId,
      bprId,
      branchId,
      createdBy,
      createdFrom,
      createdTo,
    });

    return NextResponse.json(
      {
        data: result.items,
        meta: result.meta,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[List Simulations API] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan internal server saat mengambil daftar simulasi.",
        },
      },
      { status: 500 }
    );
  }
}

