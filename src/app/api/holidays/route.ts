import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/holidays?upcoming=true&limit=10
// Public endpoint — list upcoming holidays
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const upcoming = searchParams.get('upcoming') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    const today = new Date().toISOString().split('T')[0] // "2025-01-15"

    let where: any = { isActive: true }

    if (upcoming) {
      // Get holidays from today onwards in the current year + recurring holidays
      const currentYear = today.split('-')[0]
      where.OR = [
        { date: { gte: today } },
        { isRecurring: true, isActive: true }
      ]
    }

    const holidays = await db.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
      take: limit,
    })

    return NextResponse.json(holidays)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
