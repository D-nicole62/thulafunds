import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const projectRef = "cqmcfffgbaiocdjtrseb"
const password = process.env.DATABASE_URL?.match(/:(.+?)@/)?.[1] ?? ""

const candidates: { label: string; url: string }[] = [
  { label: "current DATABASE_URL", url: process.env.DATABASE_URL ?? "" },
  {
    label: "aws-0 pooler (6543)",
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  },
  {
    label: "aws-0 pooler (5432 direct)",
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  },
  {
    label: "db direct host",
    url: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
  },
]

async function tryUrl(label: string, url: string) {
  if (!url) return false
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    console.log(`OK  ${label}`)
    console.log(`    ${url.replace(/:([^:@/]+)@/, ":***@")}`)
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e)
    console.log(`FAIL ${label}: ${msg}`)
    return false
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

async function main() {
  for (const c of candidates) {
    if (await tryUrl(c.label, c.url)) return
  }
  console.log("\nNo connection succeeded. Supabase project may be paused — restore it in the dashboard.")
}

main()
