import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

// Admin: list all subscriptions
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const subscriptions = await db.subscription.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(subscriptions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Admin: upgrade/downgrade/renew a user's subscription
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, tier, status, lastPaidAmount, lastPaidMethod, notes } = body

    if (!userId || !tier) {
      return NextResponse.json({ error: 'userId and tier are required' }, { status: 400 })
    }

    const validTiers = ['free', 'pro', 'enterprise']
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be free, pro, or enterprise.' }, { status: 400 })
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existing = await db.subscription.findUnique({ where: { userId } })

    // Calculate period dates
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const data: Record<string, any> = {
      tier,
      status: status || 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    }

    if (lastPaidAmount) data.lastPaidAmount = lastPaidAmount
    if (lastPaidMethod) data.lastPaidMethod = lastPaidMethod
    if (lastPaidAmount) data.lastPaidAt = now
    if (notes) data.notes = notes

    const subscription = existing
      ? await db.subscription.update({ where: { userId }, data })
      : await db.subscription.create({ data: { userId, ...data } })

    await logAudit({
      entityType: 'subscription',
      entityId: subscription.id,
      action: 'updated',
      actorId: session.userId,
      actorRole: 'admin',
      oldValue: existing ? { tier: existing.tier, status: existing.status } : { tier: 'free' },
      newValue: { tier, status: status || 'active', lastPaidAmount, lastPaidMethod },
      metadata: { targetUserId: userId, targetUserName: targetUser.name }
    })

    return NextResponse.json({ message: 'Subscription updated', subscription })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
