import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function getAuthenticatedDb() {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient()
  }
  return globalForPrisma.prisma
}

export const clerkDb = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = clerkDb
