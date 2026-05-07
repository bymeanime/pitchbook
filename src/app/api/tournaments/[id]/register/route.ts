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

    const result = await db.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id },
        include: { _count: { select: { teams: true } } }
      })

      if (!tournament) throw new Error('Tournament not found')
      if (tournament.status !== 'registration') throw new Error('Registration is not open')
      if (tournament._count.teams >= tournament.maxTeams) throw new Error('Tournament is full')

      // Check if user already has a team in this tournament
      const existingTeam = await tx.tournamentTeam.findFirst({
        where: { tournamentId: id, captainId: session.userId }
      })
      if (existingTeam) throw new Error('You already registered a team')

      const team = await tx.tournamentTeam.create({
        data: {
          name: body.teamName,
          captainId: session.userId,
          tournamentId: id
        }
      })

      return { team, tournament }
    })

    return NextResponse.json(result.team, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
