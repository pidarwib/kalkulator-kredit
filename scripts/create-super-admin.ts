/**
 * CLI Utility: Create Initial Super Admin User
 *
 * Usage:
 *   bun scripts/create-super-admin.ts [username] [password] [fullName] [email]
 *
 * Example:
 *   bun scripts/create-super-admin.ts
 *   bun scripts/create-super-admin.ts myadmin StrongP@ssw0rd! "System Admin" "admin@bpr.co.id"
 */

import { db } from "../src/lib/db";
import { UserRepository } from "../src/lib/repositories/user-repository";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const args = process.argv.slice(2);
  const username = args[0] || "superadmin";
  const password = args[1] || "SuperAdmin123!";
  const fullName = args[2] || "Super Administrator";
  const email = args[3] || "superadmin@kalkulator-kredit.local";

  console.log("==================================================");
  console.log("   CREATING / RESETTING SUPER ADMIN USER");
  console.log("==================================================");
  console.log(`👤 Username : ${username}`);
  console.log(`🔑 Password : ${password}`);
  console.log(`📛 Name     : ${fullName}`);
  console.log(`📧 Email    : ${email}`);
  console.log("--------------------------------------------------");

  // 1. Ensure SUPER_ADMIN role exists
  const role = await db.role.findUnique({
    where: { code: "SUPER_ADMIN" },
  });

  if (!role) {
    console.error("❌ Error: Role SUPER_ADMIN not found. Please run 'bun run seed' first.");
    process.exit(1);
  }

  // 2. Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    console.log(`ℹ️ User "${username}" already exists. Updating password & role to SUPER_ADMIN...`);
    const passwordHash = await hashPassword(password);
    const updated = await db.user.update({
      where: { id: existingUser.id },
      data: {
        roleId: role.id,
        fullName,
        email,
        passwordHash,
        status: "ACTIVE",
        deletedAt: null,
      },
    });
    console.log(`✅ Super Admin updated successfully! ID: ${updated.id}`);
  } else {
    console.log(`🚀 Creating new Super Admin account...`);
    const created = await UserRepository.create({
      username,
      password,
      fullName,
      email,
      roleId: role.id,
      status: "ACTIVE",
    });
    console.log(`✅ Super Admin created successfully! ID: ${created.id}`);
  }

  console.log("==================================================");
  console.log("🎉 You can now login at http://localhost:3000/login");
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("❌ Failed to create Super Admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
