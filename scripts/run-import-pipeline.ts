import { runReferenceDataPipeline } from "../src/lib/pipeline";

async function main() {
  console.log("🚀 Starting Reference Data Import Pipeline...");
  const result = runReferenceDataPipeline();

  if (!result.success) {
    console.error("❌ Pipeline Validation Failed with errors:");
    for (const err of result.report.errors) {
      console.error(`  - [${err.entity} | ${err.field}]: ${err.message}`);
    }
    process.exit(1);
  }

  console.log("✅ Pipeline executed successfully!");
  console.log(`📄 Document SHA256 Hash: ${result.documentHash}`);
  console.log("📊 Extracted & Validated Stats:");
  console.log(`  - BPRs: ${result.report.stats.bprCount}`);
  console.log(`  - Products: ${result.report.stats.productCount}`);
  console.log(`  - Credit Parameters: ${result.report.stats.creditParameterCount}`);
  console.log(`  - Fee Parameters: ${result.report.stats.feeParameterCount}`);
  console.log(`  - Payment Offices: ${result.report.stats.paymentOfficeCount}`);
  console.log(`  - Insurance Rates: ${result.report.stats.insuranceRateCount}`);
  console.log(`\n📁 Seed-ready artifacts exported to reference_source/import/:`);
  for (const file of result.exportedFiles) {
    console.log(`  - ${file}`);
  }

  process.exit(0);
}

main();
