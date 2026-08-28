import { NextRequest, NextResponse } from "next/server";
import { requirePermission, forbiddenResponse } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { sanitizeAuditPayload } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/audit-logs
 *
 * Retrieves system audit logs with multi-criteria filtering, search, pagination, and RBAC scoping.
 * Permission: AUDIT_VIEW
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate & Authorize
  const auth = await requirePermission(request, "AUDIT_VIEW");
  if (!auth.allowed) {
    return auth.errorResponse!;
  }

  const caller = auth.user!;
  const { searchParams } = new URL(request.url);

  // 2. Parse Query Params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const action = searchParams.get("action") || undefined;
  const entityType = searchParams.get("entityType") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const search = searchParams.get("search")?.trim() || undefined;
  const startDateStr = searchParams.get("startDate") || undefined;
  const endDateStr = searchParams.get("endDate") || undefined;

  // 3. Build Prisma Where Clause with Role-based Scoping
  const where: Prisma.AuditLogWhereInput = {};

  // Scope: Admin only sees audit logs performed by users within their BPR
  if (caller.role === "ADMIN" && caller.bprId) {
    where.user = {
      bprId: caller.bprId,
    };
  }

  if (action) {
    where.action = { equals: action, mode: "insensitive" };
  }

  if (entityType) {
    where.entityType = { equals: entityType, mode: "insensitive" };
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDateStr || endDateStr) {
    where.createdAt = {};
    if (startDateStr) {
      where.createdAt.gte = new Date(startDateStr);
    }
    if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search, mode: "insensitive" } },
      { user: { username: { contains: search, mode: "insensitive" } } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }

  try {
    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
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
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const sanitizedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      user: log.user
        ? {
            id: log.user.id,
            username: log.user.username,
            fullName: log.user.fullName,
            role: log.user.role?.code || "UNKNOWN",
            roleName: log.user.role?.name || "",
            bpr: log.user.bpr?.name || null,
            branch: log.user.branch?.name || null,
          }
        : null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValue: sanitizeAuditPayload(log.oldValue),
      newValue: sanitizeAuditPayload(log.newValue),
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        data: sanitizedLogs,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AuditLogs API] Fetch error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Gagal mengambil daftar audit log.",
        },
      },
      { status: 500 }
    );
  }
}
