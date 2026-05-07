import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

const VALID_MATCH_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled']

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
  } catch (error) {
    console.error('[Matches] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
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
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const tournament = await db.tournament.findUnique({ where: { id } })
    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    if (tournament.hostId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Input validation ──
    const round = Number(body.round)
    if (!Number.isInteger(round) || round < 1) {
      return NextResponse.json({ error: 'round must be a positive integer' }, { status: 400 })
    }

    const matchNumber = Number(body.matchNumber)
    if (!Number.isInteger(matchNumber) || matchNumber < 1) {
      return NextResponse.json({ error: 'matchNumber must be a positive integer' }, { status: 400 })
    }

    if (body.scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.scheduledDate)) {
      return NextResponse.json({ error: 'scheduledDate must be YYYY-MM-DD format' }, { status: 400 })
    }
    if (body.scheduledTime && !/^\d{2}:\d{2}$/.test(body.scheduledTime)) {
      return NextResponse.json({ error: 'scheduledTime must be HH:MM format' }, { status: 400 })
    }

    const match = await db.tournamentMatch.create({
      data: {
        round,
        matchNumber,
        scheduledDate: body.scheduledDate || null,
        scheduledTime: body.scheduledTime || null,
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
    }).catch(() => {}) // Audit log is non-critical

    return NextResponse.json(match, { status: 201 })
  } catch (error) {
    console.error('[Matches] POST error:', error)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
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
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const tournament = await db.tournament.findUnique({ where: { id } })
    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    if (tournament.hostId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { matchId, scoreA, scoreB, status, scheduledDate, scheduledTime } = body
    if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })

    // ── Input validation ──
    if (scoreA !== undefined && scoreB !== undefined) {
      if (!Number.isInteger(scoreA) || scoreA < 0) {
        return NextResponse.json({ error: 'scoreA must be a non-negative integer' }, { status: 400 })
      }
      if (!Number.isInteger(scoreB) || scoreB < 0) {
        return NextResponse.json({ error: 'scoreB must be a non-negative integer' }, { status: 400 })
      }
    }

    if (status && !VALID_MATCH_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_MATCH_STATUSES.join(', ')}` }, { status: 400 })
    }

    if (scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      return NextResponse.json({ error: 'scheduledDate must be YYYY-MM-DD format' }, { status: 400 })
    }
    if (scheduledTime && !/^\d{2}:\d{2}$/.test(scheduledTime)) {
      return NextResponse.json({ error: 'scheduledTime must be HH:MM format' }, { status: 400 })
    }

    const existing = await db.tournamentMatch.findFirst({
      where: { id: matchId, tournamentId: id }
    })
    if (!existing) return NextResponse.json({ error: 'Match not found in this tournament' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    if (scoreA !== undefined) updateData.scoreA = scoreA
    if (scoreB !== undefined) updateData.scoreB = scoreB
    if (status) updateData.status = status
    if (scheduledDate) updateData.scheduledDate = scheduledDate
    if (scheduledTime) updateData.scheduledTime = scheduledTime

    // Auto-complete match if both scores are set and no explicit status
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
    }).catch(() => {}) // Audit log is non-critical

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Matches] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}
