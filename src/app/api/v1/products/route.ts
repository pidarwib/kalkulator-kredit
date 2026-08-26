import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { ProductRepository, BprRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  bprId: z.string({ required_error: "BPR ID wajib diisi" }).uuid("Format BPR ID tidak valid"),
  code: z
    .string({ required_error: "Kode produk wajib diisi" })
    .min(2, "Kode produk minimal 2 karakter")
    .regex(/^[A-Z0-9_]+$/, "Kode produk harus berupa huruf kapital, angka, dan underscore"),
  name: z
    .string({ required_error: "Nama produk wajib diisi" })
    .min(2, "Nama produk minimal 2 karakter"),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
});

/**
 * GET /api/v1/products
 *
 * Lists products with filters and relation counts.
 * Permission: MASTER_VIEW (Super Admin, Admin)
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "MASTER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { searchParams } = new URL(request.url);

  let bprId = searchParams.get("bprId") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  // Data scope enforcement for Admin
  if (caller.role === "ADMIN") {
    if (caller.bprId) {
      bprId = caller.bprId;
    }
  }

  try {
    const products = await ProductRepository.list({
      bprId,
      status,
      search,
    });

    return NextResponse.json({ data: products }, { status: 200 });
  } catch (error) {
    console.error("[Products API] List error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil data produk.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/products
 *
 * Creates a new loan product under a BPR.
 * Permission: MASTER_CREATE (Super Admin, Admin for own BPR)
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "MASTER_CREATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Format JSON request body tidak valid.",
        },
      },
      { status: 400 }
    );
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data produk yang dimasukkan tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Admin Scope Check: Admin can only create products within their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== data.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat menambahkan produk untuk BPR yang ditugaskan kepadanya."
    );
  }

  // 1. Verify target BPR exists and is active
  const targetBpr = await BprRepository.findById(data.bprId);
  if (!targetBpr) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "BPR tujuan tidak ditemukan atau sudah tidak aktif.",
        },
      },
      { status: 404 }
    );
  }

  // 2. Check unique product code within BPR
  const existingProduct = await ProductRepository.findByBprAndCode(
    data.bprId,
    data.code,
    true
  );
  if (existingProduct) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Produk dengan kode '${data.code}' sudah terdaftar pada BPR ini.`,
        },
      },
      { status: 409 }
    );
  }

  try {
    const newProduct = await ProductRepository.create({
      bprId: data.bprId,
      code: data.code,
      name: data.name,
      description: data.description,
      status: data.status,
    });

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "PRODUCT_CREATE",
      entityType: "Product",
      entityId: newProduct.id,
      newValue: {
        bprId: newProduct.bprId,
        code: newProduct.code,
        name: newProduct.name,
        description: newProduct.description,
        status: newProduct.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Produk berhasil dibuat.",
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Products API] Create error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal membuat produk.",
        },
      },
      { status: 400 }
    );
  }
}
