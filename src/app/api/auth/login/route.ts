import { db } from '@/lib/db'
import { verifyPassword, createSessionToken } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Rate limit: 10 login attempts per minute per email
    const rateLimitKey = `login:${email}`
    if (!checkRateLimit(rateLimitKey, 10, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again in a minute.' }, { status: 429 })
    }

    // Verify database connection
    try {
      await db.$queryRaw`SELECT 1`
    } catch (dbError: any) {
      console.error('[Auth] Database connection failed:', dbError?.message)
      return NextResponse.json(
        { error: 'Database connection failed. Please check DATABASE_URL environment variable.' },
        { status: 503 }
      )
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSessionToken(user.id, user.role)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, createdAt: user.createdAt },
      token,
    })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    const msg = error instanceof Error ? error.message : 'Login failed. Please try again.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
