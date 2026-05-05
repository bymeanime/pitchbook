import { clerkDb } from './clerkDb'
import { auth } from '@clerk/nextjs/server'

export async function syncClerkUser(role: string = 'player') {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  // Check if user exists in our DB
  let user = await clerkDb.user.findUnique({ where: { id: userId } })

  if (!user) {
    // Create a placeholder user entry linked to the Clerk user ID.
    // In production, use the Clerk Backend API (clerk.users.getUser) to
    // populate email and name from the Clerk user profile.
    user = await clerkDb.user.create({
      data: {
        id: userId,
        email: '', // Will be filled from Clerk on first sync
        name: '',
        role: role,
        password: '', // Clerk handles authentication
        isVerified: true,
      },
    })
  }

  return user
}
