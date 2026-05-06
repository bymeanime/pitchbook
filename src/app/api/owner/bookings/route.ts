import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
    if (!session || (session.role !== 'venue_owner' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get bookings for this owner's venues
    const venues = await db.venue.findMany({
      where: session.role === 'venue_owner' ? { ownerId: session.userId } : {},
      include: {
        courts: {
          include: {
            bookings: {
              orderBy: { date: 'desc' },
              include: {
                members: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } }
              }
            }
          }
        },
        _count: { select: { reviews: true, tournaments: true } }
      }
    })

    // Flatten bookings
    const allBookings = venues.flatMap(v =>
      v.courts.flatMap(c =>
        c.bookings.map(b => ({ ...b, courtName: c.name, venueName: v.name }))
      )
    ).sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({ venues, bookings: allBookings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
