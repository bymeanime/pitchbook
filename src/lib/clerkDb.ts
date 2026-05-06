// clerkDb.ts — re-export the singleton from db.ts to avoid duplicate Prisma instances
export { db as clerkDb } from './db'

import { auth } from '@clerk/nextjs/server'
import { db } from './db'

export async function getAuthenticatedDb() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return db
}
