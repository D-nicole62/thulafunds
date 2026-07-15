/**
 * Create the Supabase Storage "campaigns" bucket and RLS policies.
 * Run: pnpm setup:storage
 */
import "dotenv/config"
import fs from "fs"
import path from "path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function exec(sql: string) {
  await prisma.$executeRawUnsafe(sql)
}

async function main() {
  const sqlPath = path.join(__dirname, "setup-storage.sql")
  const sql = fs.readFileSync(sqlPath, "utf8")

  // Run each statement separately (Prisma doesn't support multi-statement raw queries)
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"))

  for (const statement of statements) {
    await exec(statement)
  }

  console.log("\nStorage bucket 'campaigns' is ready.\n")
  console.log("  - Public read: enabled")
  console.log("  - Authenticated upload: enabled")
  console.log("  - Max file size: 5 MB")
  console.log("\nRetry creating your campaign with an image.\n")
}

main()
  .catch((err) => {
    console.error("\nStorage setup failed:", err instanceof Error ? err.message : err)
    console.error(
      "\nAlternatively, paste scripts/setup-storage.sql into Supabase Dashboard → SQL Editor.\n",
    )
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
