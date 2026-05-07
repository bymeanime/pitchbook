import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/bookings — list all bookings across the platform
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const bookings = await db.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        court: {
          include: { venue: { select: { id: true, name: true, city: true } } }
        },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    })

    return NextResponse.json(bookings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
