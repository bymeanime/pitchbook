import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tournament = await db.tournament.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true } },
        venue: { select: { id: true, name: true, address: true, city: true, courts: { select: { id: true, name: true, sport: true } } } },
        teams: {
          include: { captain: { select: { id: true, name: true, email: true, phone: true } } },
          orderBy: { createdAt: 'asc' }
        },
        matches: {
          include: {
            teamA: { include: { captain: { select: { id: true, name: true } } } },
            teamB: { include: { captain: { select: { id: true, name: true } } } }
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
        }
      }
    })

    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    return NextResponse.json(tournament)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const tournament = await db.tournament.findUnique({ where: { id } })
    if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (tournament.hostId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await db.tournament.update({
      where: { id },
      data: {
        status: body.status ?? tournament.status,
        name: body.name ?? tournament.name,
        description: body.description ?? tournament.description,
        maxTeams: body.maxTeams ?? tournament.maxTeams,
        entryFee: body.entryFee ?? tournament.entryFee,
        prizePool: body.prizePool ?? tournament.prizePool,
        startDate: body.startDate ?? tournament.startDate,
        endDate: body.endDate ?? tournament.endDate,
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
