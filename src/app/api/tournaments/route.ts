import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const VALID_STATUSES = ['registration', 'ongoing', 'completed', 'cancelled']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') || ''
    const status = searchParams.get('status') || ''
    const city = searchParams.get('city') || ''

    // Validate status filter if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const where: Record<string, unknown> = {}

    if (sport) where.sport = sport
    if (status) where.status = status
    if (city) {
      where.venue = { city: { contains: city } }
    }

    const tournaments = await db.tournament.findMany({
      where,
      include: {
        host: { select: { id: true, name: true } },
        venue: { select: { id: true, name: true, address: true, city: true } },
        _count: { select: { teams: true, matches: true } }
      },
      orderBy: { startDate: 'asc' },
      take: 100,
    })

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error('[Tournaments] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { parseSessionToken } = await import('@/lib/auth')
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    // Only venue owners and admins can create tournaments
    if (!['venue_owner', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Only venue owners and admins can create tournaments' }, { status: 403 })
    }

    // ── Input validation ──
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 3 || body.name.length > 200) {
      return NextResponse.json({ error: 'Tournament name must be between 3 and 200 characters' }, { status: 400 })
    }

    if (!body.sport || typeof body.sport !== 'string') {
      return NextResponse.json({ error: 'Sport is required' }, { status: 400 })
    }

    const validFormats = ['knockout', 'league', 'round_robin', 'swiss']
    if (body.format && !validFormats.includes(body.format)) {
      return NextResponse.json({ error: `Invalid format. Must be one of: ${validFormats.join(', ')}` }, { status: 400 })
    }

    const maxTeams = Number(body.maxTeams) || 8
    if (!Number.isInteger(maxTeams) || maxTeams < 2 || maxTeams > 128) {
      return NextResponse.json({ error: 'maxTeams must be an integer between 2 and 128' }, { status: 400 })
    }

    const entryFee = Number(body.entryFee) || 0
    if (entryFee < 0) {
      return NextResponse.json({ error: 'entryFee must be zero or positive' }, { status: 400 })
    }

    const prizePool = Number(body.prizePool) || 0
    if (prizePool < 0) {
      return NextResponse.json({ error: 'prizePool must be zero or positive' }, { status: 400 })
    }

    // Validate dates
    if (!body.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
      return NextResponse.json({ error: 'startDate is required and must be YYYY-MM-DD' }, { status: 400 })
    }

    if (body.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) {
      return NextResponse.json({ error: 'endDate must be YYYY-MM-DD' }, { status: 400 })
    }

    if (body.endDate && body.startDate > body.endDate) {
      return NextResponse.json({ error: 'startDate must be before or equal to endDate' }, { status: 400 })
    }

    if (!body.venueId) {
      return NextResponse.json({ error: 'venueId is required' }, { status: 400 })
    }

    // Verify the venue exists and belongs to the user (unless admin)
    const venue = await db.venue.findUnique({ where: { id: body.venueId } })
    if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    if (venue.ownerId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'You can only create tournaments for your own venues' }, { status: 403 })
    }

    const tournament = await db.tournament.create({
      data: {
        name: body.name.trim(),
        description: typeof body.description === 'string' ? body.description.trim() : null,
        sport: body.sport,
        format: body.format || 'knockout',
        maxTeams,
        entryFee,
        prizePool,
        startDate: body.startDate,
        endDate: body.endDate || null,
        venueId: body.venueId,
        hostId: session.userId,
        rules: typeof body.rules === 'string' ? body.rules : null,
      }
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    console.error('[Tournaments] POST error:', error)
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
  }
}
