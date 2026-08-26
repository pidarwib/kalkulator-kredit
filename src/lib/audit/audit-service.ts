import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Records an audit log entry in the database.
   * Safe to call; logs error without crashing the primary business operation.
   */
  static async record(params: AuditLogParams): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          oldValue:
            params.oldValue === null || params.oldValue === undefined
              ? Prisma.JsonNull
              : (params.oldValue as Prisma.InputJsonValue),
          newValue:
            params.newValue === null || params.newValue === undefined
              ? Prisma.JsonNull
              : (params.newValue as Prisma.InputJsonValue),
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      // Non-blocking catch to ensure main API response completes
      console.error("[AuditService] Failed to create audit log:", error);
    }
  }
}
