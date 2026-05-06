import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { createSessionToken } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated via Clerk' }, { status: 401 })
    }

    // Check if user already exists in our DB
    let user = await db.user.findUnique({ where: { id: userId } })

    if (!user) {
      // Create user with Clerk's ID as the primary key
      // The email/name will be filled from Clerk user profile if available
      user = await db.user.create({
        data: {
          id: userId,
          email: `clerk_${userId.slice(0, 8)}@pitchbook.local`,
          name: 'Clerk User',
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
