/**
 * Database Snapshot & Backup Utility
 * Exports core parameter versions, insurance rates, products, BPRs, and audit logs to JSON snapshot.
 */

import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function createDatabaseSnapshot(targetDir?: string): Promise<{
  timestamp: string;
  outputPath: string;
  counts: Record<string, number>;
}> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = targetDir || path.join(process.cwd(), "backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const [bprs, roles, permissions, products, creditParameters, feeParameters, insuranceRates, parameterVersions] =
    await Promise.all([
      db.bpr.findMany(),
      db.role.findMany(),
      db.permission.findMany(),
      db.product.findMany(),
      db.creditParameter.findMany(),
      db.feeParameter.findMany(),
      db.insuranceRate.findMany(),
      db.parameterVersion.findMany(),
    ]);

  const payload = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    tables: {
      bprs,
      roles,
      permissions,
      products,
      creditParameters,
      feeParameters,
      insuranceRates,
      parameterVersions,
    },
  };

  const outputPath = path.join(backupDir, `snapshot_${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf-8");

  return {
    timestamp,
    outputPath,
    counts: {
      bprs: bprs.length,
      roles: roles.length,
      permissions: permissions.length,
      products: products.length,
      creditParameters: creditParameters.length,
      feeParameters: feeParameters.length,
      insuranceRates: insuranceRates.length,
      parameterVersions: parameterVersions.length,
    },
  };
}

if (require.main === module) {
  createDatabaseSnapshot()
    .then((res) => {
      console.log(`✅ Snapshot successfully created at ${res.outputPath}`);
      console.log("Record summary:", res.counts);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Snapshot failed:", err);
      process.exit(1);
    });
}
