import { db } from '@/lib/db'
import { createSessionToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Check if Clerk is configured
    if (!process.env.CLERK_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Clerk is not configured. Use custom auth (/api/auth/login) instead.' },
        { status: 503 }
      )
    }

    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated via Clerk' }, { status: 401 })
    }

    // Try to get the Clerk user's email address to match against existing seed users
    let clerkEmail: string | null = null
    let clerkName: string = 'Clerk User'

    try {
      const { clerkClient } = await import('@clerk/nextjs/server')
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(userId)
      clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress || null
      clerkName = clerkUser.fullName || clerkUser.username || clerkName
    } catch {
      // If we can't fetch Clerk user details, fall back to creating a new user
    }

    // Check if an existing user in our DB matches this Clerk user's email
    let user: any = null
    if (clerkEmail) {
      user = await db.user.findUnique({ where: { email: clerkEmail } })
    }

    // If no match by email, check by Clerk userId (for previously synced Clerk users)
    if (!user) {
      user = await db.user.findUnique({ where: { id: userId } })
    }

    if (!user) {
      // Create a new user — link by Clerk userId, use Clerk email if available
      user = await db.user.create({
        data: {
          id: userId,
          email: clerkEmail || `clerk_${userId.slice(0, 8)}@pitchbook.local`,
          name: clerkName,
          role: 'player',
          password: '', // Clerk handles authentication
          isVerified: true,
        },
      })
    }

    // Create a session token for our custom auth system
    const token = createSessionToken(user.id, user.role)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
      token,
    })
  } catch (error: any) {
    // If Clerk auth() throws (e.g., no session), return a clear error
    if (error?.message?.includes('auth') || error?.message?.includes('Clerk')) {
      return NextResponse.json({ error: 'Clerk authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}
