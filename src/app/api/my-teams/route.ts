import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { parseSessionToken } = await import('@/lib/auth')
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const teams = await db.tournamentTeam.findMany({
      where: {
        captainId: session.userId,
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            sport: true,
            status: true,
            startDate: true,
          }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(teams)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}