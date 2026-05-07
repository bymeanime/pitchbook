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

    const where: any = {}
    if (venueId) where.venueId = venueId

    const reviews = await db.review.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json(reviews)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

    if (!venueId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating (must be 1-5)' }, { status: 400 })
    }

    // Check if user already reviewed
    const existing = await db.review.findFirst({
      where: { userId: session.userId, venueId }
    })

    if (existing) {
      return NextResponse.json({ error: 'You already reviewed this venue' }, { status: 409 })
    }

    const review = await db.review.create({
      data: { rating, comment: comment || null, userId: session.userId, venueId },
      include: { user: { select: { id: true, name: true } } }
    })

    // Update venue rating using aggregate query for performance
    const aggregate = await db.review.aggregate({
      where: { venueId },
      _avg: { rating: true },
      _count: { rating: true },
    })
    await db.venue.update({
      where: { id: venueId },
      data: {
        rating: Math.round((aggregate._avg.rating || 0) * 10) / 10,
        totalReviews: aggregate._count.rating,
      }
    })

    // Award bonus loyalty points for posting a review
    await awardReviewPoints(session.userId, venueId)

    return NextResponse.json(review, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
