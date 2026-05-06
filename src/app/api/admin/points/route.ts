import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

// POST — Admin grants or adjusts points for a user
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, points, description } = body

    if (!userId || !points || !description) {
      return NextResponse.json({ error: 'userId, points, and description are required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const transaction = await db.pointsTransaction.create({
      data: {
        userId,
        points,
        type: 'admin_grant',
        description
      }
    })

    await logAudit({
      entityType: 'user', entityId: userId,
      action: 'points_granted', actorId: session.userId, actorRole: 'admin',
      newValue: { points, description },
      metadata: { targetUserName: user.name }
    })

    return NextResponse.json({ message: `Granted ${points} points to ${user.name}`, transaction })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
