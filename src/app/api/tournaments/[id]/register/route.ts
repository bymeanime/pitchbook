import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const tournament = await db.tournament.findUnique({
      where: { id },
      include: { _count: { select: { teams: true } } }
    })

    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    if (tournament.status !== 'registration') {
      return NextResponse.json({ error: 'Registration is closed' }, { status: 400 })
    }
    if (tournament._count.teams >= tournament.maxTeams) {
      return NextResponse.json({ error: 'Tournament is full' }, { status: 400 })
    }

    // Check if user already has a team in this tournament
    const existingTeam = await db.tournamentTeam.findFirst({
      where: { tournamentId: id, captainId: session.userId }
    })
    if (existingTeam) {
      return NextResponse.json({ error: 'You already registered a team' }, { status: 409 })
    }

    const team = await db.tournamentTeam.create({
      data: {
        name: body.teamName,
        captainId: session.userId,
        tournamentId: id
      }
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
