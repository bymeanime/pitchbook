import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/holidays?year=2025&month=10
// List all holidays (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    let where: any = {}

    if (year) {
      if (month) {
        // Filter by year-month: either specific date matches or recurring month matches
        const monthNum = parseInt(month)
        where.OR = [
          { date: { startsWith: `${year}-${month.padStart(2, '0')}` } },
          { isRecurring: true, recurringMonth: monthNum }
        ]
      } else {
        // Filter by year: specific date in that year, or recurring holidays
        where.OR = [
          { date: { startsWith: year } },
          { isRecurring: true }
        ]
      }
    }

    const holidays = await db.holiday.findMany({
      where,
      orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(holidays)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/holidays
// Create a new holiday (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, date, type, isRecurring, recurringMonth, recurringDay } = body

    if (!name || !date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 })
    }

    if (isRecurring && (recurringMonth === undefined || recurringDay === undefined)) {
      return NextResponse.json({ error: 'Recurring holidays need recurringMonth and recurringDay' }, { status: 400 })
    }

    const holiday = await db.holiday.create({
      data: {
        name: name.trim(),
        date,
        type: type || 'public',
        isRecurring: !!isRecurring,
        recurringMonth: isRecurring ? recurringMonth : null,
        recurringDay: isRecurring ? recurringDay : null,
      }
    })

    return NextResponse.json(holiday, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/holidays?id=xxx
// Delete a holiday (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Holiday id is required' }, { status: 400 })

    await db.holiday.delete({ where: { id } })
    return NextResponse.json({ message: 'Holiday deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
