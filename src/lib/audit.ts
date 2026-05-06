import { db } from '@/lib/db'

/**
 * Log a significant platform action to the audit trail.
 * Append-only — never update or delete audit logs.
 */
export async function logAudit(params: {
  entityType: string
  entityId: string
  action: string
  actorId: string
  actorRole?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  metadata?: Record<string, unknown>
}) {
  await db.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId,
      actorRole: params.actorRole || null,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      metadata: JSON.stringify(params.metadata || {}),
    }
  })
}

/**
 * Check for suspicious activity patterns after an action.
 * Raises red flags if thresholds are exceeded.
 * Advisory only — no automated penalties.
 */
export async function checkRedFlags(params: {
  entityType: string
  entityId: string
  action: string
  actorId: string
}) {
  const flags: Array<{ flagType: string; severity: string; description: string; metadata: Record<string, unknown> }> = []

  // ── Rapid cancellation check ──
  // >3 cancellations by the same actor in the last 7 days
  if (params.action === 'cancelled') {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const cancelCount = await db.booking.count({
      where: {
        cancelledBy: params.actorId,
        cancelledAt: { gte: sevenDaysAgo },
        status: 'cancelled'
      }
    })

    if (cancelCount >= 3) {
      // Check if a red flag already exists for this user in the last 7 days
      const existingFlag = await db.redFlag.findFirst({
        where: {
          entityType: 'user',
          entityId: params.actorId,
          flagType: 'rapid_cancellation',
          isResolved: false,
          createdAt: { gte: sevenDaysAgo }
        }
      })

      if (!existingFlag) {
        flags.push({
          flagType: 'rapid_cancellation',
          severity: cancelCount >= 5 ? 'high' : 'medium',
          description: `User has cancelled ${cancelCount} bookings in the last 7 days`,
          metadata: { cancelCount, period: '7d' }
        })
      }
    }
  }

  // ── Frequent rejection check ──
  // >5 rejections by the same venue in the last 7 days
  if (params.action === 'rejected') {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const rejectCount = await db.booking.count({
      where: {
        court: { venue: { ownerId: params.actorId } },
        rejectedBy: params.actorId,
        rejectedAt: { gte: sevenDaysAgo },
        status: 'rejected'
      }
    })

    if (rejectCount >= 5) {
      const existingFlag = await db.redFlag.findFirst({
        where: {
          entityType: 'user',
          entityId: params.actorId,
          flagType: 'frequent_rejection',
          isResolved: false,
          createdAt: { gte: sevenDaysAgo }
        }
      })

      if (!existingFlag) {
        flags.push({
          flagType: 'frequent_rejection',
          severity: rejectCount >= 10 ? 'high' : 'medium',
          description: `Venue owner has rejected ${rejectCount} bookings in the last 7 days`,
          metadata: { rejectCount, period: '7d', venueId: params.entityId }
        })
      }
    }
  }

  // Create red flags
  for (const flag of flags) {
    await db.redFlag.create({
      data: {
        entityType: params.entityType === 'booking' ? 'user' : params.entityType,
        entityId: params.actorId,
        ...flag,
        metadata: JSON.stringify(flag.metadata),
      }
    })
  }

  return flags.length > 0
}
