import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') || ''
    const status = searchParams.get('status') || ''
    const city = searchParams.get('city') || ''

    const where: any = {}

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
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json(tournaments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { parseSessionToken } = await import('@/lib/auth')
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const tournament = await db.tournament.create({
      data: {
        name: body.name,
        description: body.description || null,
        sport: body.sport,
        format: body.format || 'knockout',
        maxTeams: body.maxTeams || 8,
        entryFee: body.entryFee || 0,
        prizePool: body.prizePool || 0,
        startDate: body.startDate,
        endDate: body.endDate,
        venueId: body.venueId,
        hostId: session.userId,
        rules: body.rules || null,
      }
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
