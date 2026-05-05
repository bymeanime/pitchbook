import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venueId') || ''

    const where: any = {}
    if (venueId) where.venueId = venueId

    const reviews = await db.review.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
    const session = parseSessionToken(token)
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

    // Update venue rating
    const allReviews = await db.review.findMany({ where: { venueId } })
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    await db.venue.update({
      where: { id: venueId },
      data: { rating: Math.round(avgRating * 10) / 10, totalReviews: allReviews.length }
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
