import { db } from '@/lib/db'

/**
 * Loyalty points configuration.
 * Earn-only for now — redemption is empty.
 * Online bookings only — walk-ins don't earn points.
 */

// Points per NPR spent (e.g., 1 point per 100 NPR)
export const POINTS_PER_NPR = 0.01

// Bonus points for certain actions
export const REVIEW_BONUS_POINTS = 5
export const REFERRAL_BONUS_POINTS = 50

/**
 * Award loyalty points when a booking is completed.
 * Only for online bookings (not walk-in).
 */
export async function awardBookingPoints(params: {
  userId: string
  bookingId: string
  amount: number
  isWalkIn: boolean
}) {
  if (params.isWalkIn) return null // Walk-ins don't earn points

  const points = Math.max(1, Math.floor(params.amount * POINTS_PER_NPR))

  const transaction = await db.pointsTransaction.create({
    data: {
      userId: params.userId,
      bookingId: params.bookingId,
      points,
      type: 'booking_completed',
      description: `Earned ${points} points for completing online booking (${Math.round(params.amount)} NPR)`
    }
  })

  return transaction
}

/**
 * Award bonus points for posting a review.
 */
export async function awardReviewPoints(userId: string, venueId: string) {
  const points = REVIEW_BONUS_POINTS

  const transaction = await db.pointsTransaction.create({
    data: {
      userId,
      points,
      type: 'review_posted',
      description: `Earned ${points} bonus points for posting a venue review`
    }
  })

  return transaction
}

/**
 * Get a user's total points balance.
 */
export async function getPointsBalance(userId: string): Promise<number> {
  const result = await db.pointsTransaction.aggregate({
    where: { userId },
    _sum: { points: true }
  })
  return result._sum.points || 0
}

/**
 * Get a user's points transaction history.
 */
export async function getPointsHistory(userId: string, page = 1, limit = 20) {
  const [transactions, total] = await Promise.all([
    db.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.pointsTransaction.count({ where: { userId } })
  ])

  return {
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  }
}
