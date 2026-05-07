import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { awardReviewPoints } from '@/lib/points'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venueId') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))

    const where: Record<string, string> = {}
    if (venueId) where.venueId = venueId

    const reviews = await db.review.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error('[Reviews] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { venueId, rating, comment } = body

    if (!venueId) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 })
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating (must be an integer 1-5)' }, { status: 400 })
    }

    // ── Atomic: check duplicate + create review + update venue rating in transaction ──
    const review = await db.$transaction(async (tx) => {
      // Check if user already reviewed
      const existing = await tx.review.findFirst({
        where: { userId: session.userId, venueId }
      })

      if (existing) throw new Error('You already reviewed this venue')

      // Create the review
      const newReview = await tx.review.create({
        data: { rating, comment: typeof comment === 'string' ? comment : null, userId: session.userId, venueId },
        include: { user: { select: { id: true, name: true } } }
      })

      // Update venue rating using aggregate for consistency
      const aggregate = await tx.review.aggregate({
        where: { venueId },
        _avg: { rating: true },
        _count: { rating: true },
      })
      await tx.venue.update({
        where: { id: venueId },
        data: {
          rating: Math.round((aggregate._avg.rating || 0) * 10) / 10,
          totalReviews: aggregate._count.rating,
        }
      })

      return newReview
    })

    // Award bonus loyalty points for posting a review (non-critical, don't fail the review)
    try {
      await awardReviewPoints(session.userId, venueId)
    } catch (e) {
      console.error('[Reviews] Points award failed (non-fatal):', e)
    }

    return NextResponse.json(review, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create review'
    const status = message === 'You already reviewed this venue' ? 409 : 500
    console.error('[Reviews] POST error:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
