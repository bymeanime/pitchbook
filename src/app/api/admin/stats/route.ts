import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const [totalUsers, totalVenues, totalBookings, totalTournaments, totalRevenue, platformEarnings] = await Promise.all([
      db.user.count(),
      db.venue.count(),
      db.booking.count({ where: { status: { in: ['confirmed', 'completed'] } } }),
      db.tournament.count(),
      db.booking.aggregate({ _sum: { totalPrice: true }, where: { status: { in: ['confirmed', 'completed'] } } }),
      db.booking.aggregate({ _sum: { platformFee: true }, where: { status: { in: ['confirmed', 'completed'] } } })
    ])

    const recentBookings = await db.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        court: { include: { venue: { select: { name: true, city: true } } } },
        members: { include: { user: { select: { name: true } } } }
      }
    })

    const topVenues = await db.venue.findMany({
      take: 5,
      orderBy: { totalReviews: 'desc' },
      include: { _count: { select: { bookings: true, reviews: true } } }
    })

    return NextResponse.json({
      totalUsers,
      totalVenues,
      totalBookings,
      totalTournaments,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      platformEarnings: platformEarnings._sum.platformFee || 0,
      recentBookings,
      topVenues
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
