import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { DATABASE_SETUP_STEPS, getDatabaseErrorMessage } from "../lib/db-errors"

const prisma = new PrismaClient()

async function main() {
  console.log("\nThula Funds — Database connection test\n")
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "set" : "MISSING")
  console.log("DIRECT_URL:", process.env.DIRECT_URL ? "set" : "MISSING")

  if (!process.env.DATABASE_URL) {
    console.error("\nERROR: DATABASE_URL is not set in .env\n")
    process.exit(1)
  }

  try {
    const start = Date.now()
    await prisma.$connect()
    const count = await prisma.profile.count()
    console.log(`\nOK — connected (${Date.now() - start}ms), profiles: ${count}\n`)
  } catch (error) {
    console.error("\nFAILED —", getDatabaseErrorMessage(error))
    console.error("\nSteps to fix:")
    for (const step of DATABASE_SETUP_STEPS) {
      console.error(`  • ${step}`)
    }
    console.error("")
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
