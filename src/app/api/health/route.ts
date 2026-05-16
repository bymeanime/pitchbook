import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * Health check endpoint — verifies database connectivity and env configuration.
 * Useful for debugging Vercel deployment issues.
 * Call: GET /api/health
 */
export async function GET() {
  const checks: { name: string; ok: boolean; detail?: string }[] = []

  // Check DATABASE_URL (never expose the actual value)
  const dbUrl = process.env.DATABASE_URL
  checks.push({
    name: 'DATABASE_URL',
    ok: !!dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')),
    detail: dbUrl ? 'configured' : 'NOT SET',
  })

  // Check JWT_SECRET (never expose length)
  checks.push({
    name: 'JWT_SECRET',
    ok: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16,
    detail: process.env.JWT_SECRET ? 'set' : 'NOT SET',
  })

  // Check SEED_SECRET
  checks.push({
    name: 'SEED_SECRET',
    ok: !!process.env.SEED_SECRET,
    detail: process.env.SEED_SECRET ? 'set' : 'NOT SET (seed endpoints disabled)',
  })

  // Check Clerk (optional)
  checks.push({
    name: 'Clerk',
    ok: true, // Clerk is optional
    detail: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'configured (optional)' : 'not configured (custom auth)',
  })

  // Check database connectivity
  try {
    await db.$queryRaw`SELECT 1 as ok`
    const userCount = await db.user.count()
    checks.push({
      name: 'Database',
      ok: true,
      detail: `connected, ${userCount} users`,
    })
  } catch (error: unknown) {
    console.error('[Health]', error)
    checks.push({
      name: 'Database',
      ok: false,
      detail: 'connection failed',
    })
  }

  const allOk = checks.every(c => c.ok)

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  )
}
