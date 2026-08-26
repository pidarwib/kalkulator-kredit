import { checkDatabaseConnection, db } from "../src/lib/db";

async function main() {
  console.log("🔍 Checking PostgreSQL / Supabase connection...");
  const result = await checkDatabaseConnection();

  if (result.connected) {
    console.log(`✅ ${result.message} (Latency: ${result.latencyMs}ms)`);
    await db.$disconnect();
    process.exit(0);
  } else {
    console.error(`❌ ${result.message}`);
    await db.$disconnect();
    process.exit(1);
  }
}

main();
