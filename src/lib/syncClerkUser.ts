// syncClerkUser.ts — Sync a Clerk user into our DB
// NOTE: Clerk integration is deprecated in favor of custom auth.
// This function will throw if Clerk is not configured.

import { db } from './db'

export async function syncClerkUser(role: string = 'player') {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Clerk is not configured. Use custom auth instead.')
  }

  const { auth, clerkClient } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  // Get the Clerk user's email to match against existing DB users
  let clerkEmail: string | null = null
  let clerkName: string = ''

  try {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress || null
    clerkName = clerkUser.fullName || clerkUser.username || ''
  } catch {
    // If Clerk backend is unavailable, fall back to userId matching
  }

  // First try to match by email (for seed users and existing accounts)
  let user: any = null
  if (clerkEmail) {
    user = await db.user.findUnique({ where: { email: clerkEmail } })
  }

  // Fall back to matching by Clerk userId (for previously synced users)
  if (!user) {
    user = await db.user.findUnique({ where: { id: userId } })
  }

  if (!user) {
    // Create a new user linked to the Clerk user ID
    user = await db.user.create({
      data: {
        id: userId,
        email: clerkEmail || `clerk_${userId.slice(0, 8)}@pitchbook.local`,
        name: clerkName || 'Clerk User',
        role: role,
        password: '', // Clerk handles authentication
        isVerified: true,
      },
    })
  }

  return user
}
