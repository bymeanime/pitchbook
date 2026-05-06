// clerkDb.ts — re-export the singleton from db.ts to avoid duplicate Prisma instances
// NOTE: Clerk integration is deprecated in favor of custom auth.
// This file is kept for backward compatibility but the Clerk-dependent
// functions will throw if Clerk is not configured.

export { db as clerkDb } from './db'

export async function getAuthenticatedDb() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Clerk is not configured. Use custom auth middleware instead.')
  }
  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  const { db } = await import('./db')
  return db
}
