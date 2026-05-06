import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

// GET — List all matches for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const matches = await db.tournamentMatch.findMany({
      where: { tournamentId: id },
      include: {
        teamA: { include: { captain: { select: { id: true, name: true } } } },
        teamB: { include: { captain: { select: { id: true, name: true } } } },
      },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
    })
    return NextResponse.json(matches)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — Create a match for a tournament (host/admin only)
export async function POST(
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
    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    if (tournament.hostId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const match = await db.tournamentMatch.create({
      data: {
        round: body.round || 1,
        matchNumber: body.matchNumber || 1,
        scheduledDate: body.scheduledDate,
        scheduledTime: body.scheduledTime,
        tournamentId: id,
        teamAId: body.teamAId || null,
        teamBId: body.teamBId || null,
        courtId: body.courtId || null,
      }
    })

    await logAudit({
      entityType: 'tournament', entityId: id,
      action: 'match_created', actorId: session.userId, actorRole: session.role,
      newValue: { matchId: match.id, round: match.round, matchNumber: match.matchNumber },
    })

    return NextResponse.json(match, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH — Update match score/status (host/admin only)
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
    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    if (tournament.hostId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { matchId, scoreA, scoreB, status, scheduledDate, scheduledTime } = body
    if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })

    const existing = await db.tournamentMatch.findFirst({
      where: { id: matchId, tournamentId: id }
    })
    if (!existing) return NextResponse.json({ error: 'Match not found in this tournament' }, { status: 404 })

    const updateData: Record<string, any> = {}
    if (scoreA !== undefined) updateData.scoreA = scoreA
    if (scoreB !== undefined) updateData.scoreB = scoreB
    if (status) updateData.status = status
    if (scheduledDate) updateData.scheduledDate = scheduledDate
    if (scheduledTime) updateData.scheduledTime = scheduledTime

    // Auto-complete match if both scores are set
    if (scoreA !== undefined && scoreB !== undefined && !status) {
      updateData.status = 'completed'
    }

    const updated = await db.tournamentMatch.update({
      where: { id: matchId },
      data: updateData
    })

    await logAudit({
      entityType: 'tournament', entityId: id,
      action: 'match_updated', actorId: session.userId, actorRole: session.role,
      oldValue: { scoreA: existing.scoreA, scoreB: existing.scoreB, status: existing.status },
      newValue: updateData,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
