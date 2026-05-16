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

    // Validate team name
    const teamName = body.teamName
    if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2 || teamName.trim().length > 100) {
      return NextResponse.json({ error: 'Team name must be between 2 and 100 characters' }, { status: 400 })
    }

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
          name: teamName.trim(),
          captainId: session.userId,
          tournamentId: id
        }
      })

      return { team, tournament }
    })

    return NextResponse.json(result.team, { status: 201 })
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Failed to register'
    let status = 500
    if (message.includes('not found')) status = 404
    else if (message.includes('full')) status = 409
    else if (message.includes('already')) status = 409
    else if (['Registration is not open', 'Team name must be between 2 and 100 characters'].includes(message)) status = 400
    return NextResponse.json({ error: message }, { status })
  }
}
