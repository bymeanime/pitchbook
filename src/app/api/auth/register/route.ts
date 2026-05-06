import { db } from '@/lib/db'
import { hashPassword, createSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // Only allow 'player' role on self-registration.
    // Admin and venue_owner roles must be assigned via the admin dashboard.
    const allowedRoles = ['player']
    if (process.env.SEED_SECRET && body.seedSecret === process.env.SEED_SECRET) {
      // Seed mode: allow any role (used during initial setup only)
      allowedRoles.push('venue_owner', 'admin')
    }
    const userRole = allowedRoles.includes(role) ? role : 'player'

    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        phone: body.phone || null,
      }
    })

    const token = createSessionToken(user.id, user.role)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 })
  }
}
