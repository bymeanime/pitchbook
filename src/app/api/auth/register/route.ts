import { db } from '@/lib/db'
import { hashPassword, createSessionToken } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_ROLES = ['player', 'venue_owner']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 })
    }

    // Validate role — only allow player and venue_owner on self-registration
    const role = ALLOWED_ROLES.includes(body.role) ? body.role : 'player'

    // Rate limit: 5 registrations per minute per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `register:${ip}`
    if (!checkRateLimit(rateLimitKey, 5, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        phone: body.phone || null,
      }
    })

    // Auto-create subscription for venue owners (free tier with trial)
    if (role === 'venue_owner') {
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 30) // 30-day trial
      await db.subscription.create({
        data: {
          userId: user.id,
          tier: 'pro',
          status: 'trial',
          trialStartsAt: new Date(),
          trialEndsAt,
        }
      })
    }

    const token = await createSessionToken(user.id, user.role)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
      token
    }, { status: 201 })
  } catch (error) {
    console.error('[Auth] Registration error:', error)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
