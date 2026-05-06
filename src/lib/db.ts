import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is required but not set. ' +
      'Please add it to your .env.local file or Vercel environment variables.'
    )
  }

  // Supabase uses PgBouncer which conflicts with Prisma's prepared statements.
  // Add ?pgbouncer=true to disable prepared statements.
  const url = connectionString.includes('pgbouncer=true')
    ? connectionString
    : connectionString.includes('?')
      ? `${connectionString}&pgbouncer=true&connect_timeout=15`
      : `${connectionString}?pgbouncer=true&connect_timeout=15`

  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db