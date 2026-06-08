import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Testing Supabase Database connection (via Prisma)...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'MISSING')

    if (!process.env.DATABASE_URL) {
        console.error('ERROR: DATABASE_URL is not set in your .env file.')
        return
    }

    try {
        const start = Date.now()
        // Attempt a simple query
        await prisma.$connect()
        console.log('Successfully connected to the database!')

        const profilesCount = await prisma.profile.count()
        console.log(`Successfully queried 'profiles' table. Count: ${profilesCount}`)

        const end = Date.now()
        console.log(`Connection test completed in ${end - start}ms`)
    } catch (error) {
        console.error('FAILED to connect to the database.')
        console.error('Error details:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
