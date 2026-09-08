/**
 * Applies donations schema fixes via direct Postgres (requires `pg` package).
 * Run: npx tsx scripts/apply-donations-schema.ts
 */
import "dotenv/config"
import { readFileSync } from "fs"
import { join } from "path"

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error("Missing DIRECT_URL or DATABASE_URL in .env")
    process.exit(1)
  }

  let Client: typeof import("pg").Client
  try {
    ;({ Client } = await import("pg"))
  } catch {
    console.error("Install pg first: npm install pg --no-save")
    console.error("Then re-run: npx tsx scripts/apply-donations-schema.ts")
    process.exit(1)
  }

  const sql = readFileSync(join(process.cwd(), "scripts/fix-donations-schema.sql"), "utf8")
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log("Running fix-donations-schema.sql...")
  await client.query(sql)
  await client.end()
  console.log("Schema migration complete.")
}

main().catch((err) => {
  console.error("Schema migration failed:", err instanceof Error ? err.message : err)
  process.exit(1)
})
