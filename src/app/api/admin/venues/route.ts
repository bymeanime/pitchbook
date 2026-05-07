import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/venues — list all venues with stats
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const venues = await db.venue.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        courts: {
          include: {
            _count: { select: { bookings: true } }
          }
        },
        _count: {
          select: {
            reviews: true,
            tournaments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Flatten court booking counts into venue-level stats
    const venuesWithStats = venues.map(v => {
      const totalBookings = v.courts.reduce((sum, c) => sum + c._count.bookings, 0)
      const { courts: _, _count, ...rest } = v
      return {
        ...rest,
        _count: {
          ..._count,
          bookings: totalBookings,
          courts: v.courts.length,
        }
      }
    })

    return NextResponse.json(venuesWithStats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
