import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const venues = await db.venue.findMany({
      where: { isOpen: true },
      include: {
        owner: { select: { id: true, name: true } },
        courts: { select: { id: true, name: true, sport: true, pricePerHour: true, isIndoor: true } },
        _count: { select: { reviews: true, bookings: true, tournaments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(venues)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
    if (!session || session.role !== 'venue_owner') {
      return NextResponse.json({ error: 'Only venue owners can create venues' }, { status: 403 })
    }

    const venue = await db.venue.create({
      data: {
        ...body,
        ownerId: session.userId,
        images: JSON.stringify(body.images || []),
        amenities: JSON.stringify(body.amenities || []),
        sports: JSON.stringify(body.sports || []),
      }
    })

    return NextResponse.json(venue, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
