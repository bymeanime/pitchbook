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
        _count: { select: { reviews: true, tournaments: true } }
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

    // Destructure courts from body so they are not spread into Prisma create
    const { courts: courtsData, ...venueData } = body

    // Ensure JSON fields are not double-encoded
    const safeStringify = (val: any): string => {
      if (typeof val === 'string') {
        try { return JSON.stringify(JSON.parse(val)) }
        catch { return JSON.stringify([val]) }
      }
      return JSON.stringify(val || [])
    }

    const venue = await db.venue.create({
      data: {
        ...venueData,
        ownerId: session.userId,
        images: safeStringify(venueData.images),
        amenities: safeStringify(venueData.amenities),
        sports: safeStringify(venueData.sports),
      }
    })

    // Create courts if provided
    if (Array.isArray(courtsData) && courtsData.length > 0) {
      for (const court of courtsData) {
        await db.court.create({
          data: {
            name: court.name,
            sport: court.sport,
            surface: court.surface || 'artificial_turf',
            isIndoor: court.isIndoor || false,
            pricePerHour: Number(court.pricePerHour) || 0,
            venueId: venue.id,
          }
        })
      }
    }

    return NextResponse.json(venue, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
