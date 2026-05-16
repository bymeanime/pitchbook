import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/users — list all users with their stats
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            ownedVenues: true,
            reviews: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(users)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/admin/users — update user role
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role || !['player', 'venue_owner', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 })
    }

    // Prevent admin from demoting themselves
    if (userId === session.userId && role !== 'admin') {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Get user before update for audit log
    const beforeUser = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!beforeUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true }
    })

    // Audit log for role change
    try {
      const { logAudit } = await import('@/lib/audit')
      await logAudit({
        entityType: 'user', entityId: userId,
        action: 'role_changed', actorId: session.userId, actorRole: 'admin',
        oldValue: { role: beforeUser.role },
        newValue: { role },
      })
    } catch (e) {
      console.error('[Admin Users] Audit log failed (non-fatal):', e)
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Failed to update user'
    const status = message.includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
