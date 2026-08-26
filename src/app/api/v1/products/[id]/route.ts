import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { ProductRepository } from "@/lib/repositories";
import { AuditService } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateProductSchema = z.object({
  name: z.string().min(2, "Nama produk minimal 2 karakter").optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

/**
 * GET /api/v1/products/:id
 *
 * Retrieves a single Product with all its child relation counts (Credit Parameters, Fee, Insurance, Simulation, Calculation).
 * Permission: MASTER_VIEW
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "MASTER_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  const product = await ProductRepository.findById(id);
  if (!product) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Produk tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only view products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== product.bprId) {
    return forbiddenResponse(
      "Anda tidak memiliki hak akses untuk melihat data produk pada BPR ini."
    );
  }

  return NextResponse.json({ data: product }, { status: 200 });
}

/**
 * PATCH /api/v1/products/:id
 *
 * Updates product details and lifecycle status.
 * Permission: MASTER_UPDATE
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "MASTER_UPDATE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  const existingProduct = await ProductRepository.findById(id);
  if (!existingProduct) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Produk tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only update products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== existingProduct.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat mengubah data produk pada BPR yang ditugaskan kepadanya."
    );
  }

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

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const err of parsed.error.errors) {
      details[err.path.join(".")] = err.message;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data pembaruan produk tidak valid.",
          details,
        },
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const updatedProduct = await ProductRepository.update(id, {
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
      action: "PRODUCT_UPDATE",
      entityType: "Product",
      entityId: id,
      oldValue: {
        name: existingProduct.name,
        description: existingProduct.description,
        status: existingProduct.status,
      },
      newValue: {
        name: updatedProduct.name,
        description: updatedProduct.description,
        status: updatedProduct.status,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Produk berhasil diperbarui.",
        data: updatedProduct,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Products API] Update error:", error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Gagal memperbarui produk.",
        },
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/v1/products/:id
 *
 * Soft deletes a product.
 * Permission: MASTER_DELETE (Super Admin, Admin for own BPR)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, "MASTER_DELETE");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { id } = params;

  const existingProduct = await ProductRepository.findById(id);
  if (!existingProduct) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Produk tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  // Admin Scope Check: Admin can only delete products in their assigned BPR
  if (caller.role === "ADMIN" && caller.bprId && caller.bprId !== existingProduct.bprId) {
    return forbiddenResponse(
      "Admin hanya dapat menghapus produk pada BPR yang ditugaskan kepadanya."
    );
  }

  try {
    await ProductRepository.softDelete(id);

    // Record Audit Log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await AuditService.record({
      userId: caller.id,
      action: "PRODUCT_DELETE",
      entityType: "Product",
      entityId: id,
      oldValue: {
        code: existingProduct.code,
        name: existingProduct.name,
        bprId: existingProduct.bprId,
      },
      ipAddress,
      userAgent,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Products API] Delete error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal menghapus produk.",
        },
      },
      { status: 500 }
    );
  }
}
