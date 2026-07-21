/**
 * Create the Supabase Storage "campaigns" bucket.
 * Run: pnpm setup:storage
 */
import "dotenv/config"
import { createAdminClient } from "../lib/supabase/admin"

async function main() {
  const supabase = createAdminClient()

  const { data: existing } = await supabase.storage.getBucket("campaigns")
  if (existing) {
    console.log("\nStorage bucket 'campaigns' already exists.\n")
    return
  }

  const { error } = await supabase.storage.createBucket("campaigns", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  })

  if (error) throw error

  console.log("\nStorage bucket 'campaigns' is ready.\n")
  console.log("  - Public read: enabled")
  console.log("  - Max file size: 5 MB")
  console.log("\nIf uploads fail with RLS errors, run scripts/setup-storage.sql in Supabase SQL Editor.\n")
  console.log("Retry creating your campaign with an image.\n")
}

main().catch((err) => {
  console.error("\nStorage setup failed:", err instanceof Error ? err.message : err)
  console.error(
    "\nAlternatively, create a public 'campaigns' bucket in Supabase Dashboard → Storage,\n" +
      "or paste scripts/setup-storage.sql into Supabase Dashboard → SQL Editor.\n",
  )
  process.exit(1)
})
