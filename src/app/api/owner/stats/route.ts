import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
    if (!session || session.role !== 'venue_owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const venues = await db.venue.findMany({
      where: { ownerId: session.userId },
      include: {
        courts: { include: { _count: { select: { bookings: true } } } },
        _count: { select: { bookings: true, reviews: true, tournaments: true } }
      }
    })

    const venueIds = venues.map(v => v.id)

    const bookingStats = await db.booking.groupBy({
      by: ['status'],
      where: {
        court: { venueId: { in: venueIds } }
      },
      _count: true,
      _sum: { totalPrice: true, platformFee: true }
    })

    const totalRevenue = await db.booking.aggregate({
      _sum: { totalPrice: true },
      where: {
        court: { venueId: { in: venueIds } },
        status: { in: ['confirmed', 'completed'] }
      }
    })

    const monthlyRevenue = await db.booking.findMany({
      where: {
        court: { venueId: { in: venueIds } },
        status: { in: ['confirmed', 'completed'] }
      },
      select: { date: true, totalPrice: true, platformFee: true }
    })

    // Group by month
    const monthly = monthlyRevenue.reduce((acc: any, b) => {
      const month = b.date.substring(0, 7) // "2025-06"
      if (!acc[month]) acc[month] = { revenue: 0, fees: 0, count: 0 }
      acc[month].revenue += b.totalPrice
      acc[month].fees += b.platformFee
      acc[month].count += 1
      return acc
    }, {})

    return NextResponse.json({
      venues,
      bookingStats,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      monthly
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
