import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveTier, checkTrialExpiry, TIER_LIMITS, type Tier, type SubscriptionStatus } from '@/lib/subscription'

// Explicit allowlist of fields that can be set on venue creation
const VENUE_ALLOWED_FIELDS = [
  'name', 'description', 'address', 'city', 'phone', 'email',
  'website', 'amenities', 'sports', 'images', 'isOpen',
] as const

export async function GET() {
  try {
    const venues = await db.venue.findMany({
      where: { isOpen: true },
      include: {
        owner: { select: { id: true, name: true } },
        courts: { select: { id: true, name: true, sport: true, pricePerHour: true, isIndoor: true } },
        _count: { select: { reviews: true, tournaments: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(venues)
  } catch (error) {
    console.error('[Venues] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await parseSessionToken(token)
    if (!session || session.role !== 'venue_owner') {
      return NextResponse.json({ error: 'Only venue owners can create venues' }, { status: 403 })
    }

    // ── Subscription tier enforcement ──
    let subscription = await db.subscription.findUnique({ where: { userId: session.userId } })
    if (subscription?.status === 'trial') {
      const expired = checkTrialExpiry(subscription.status, subscription.trialEndsAt)
      if (expired) subscription = await db.subscription.update({ where: { id: subscription.id }, data: { status: 'expired' } })
    }
    const effectiveTier = getEffectiveTier(subscription?.tier as Tier | null, subscription?.status as SubscriptionStatus | null, subscription?.trialEndsAt)
    const limits = TIER_LIMITS[effectiveTier]

    if (limits.maxVenues !== Infinity) {
      const venueCount = await db.venue.count({ where: { ownerId: session.userId } })
      if (venueCount >= limits.maxVenues) {
        return NextResponse.json({
          error: `Your ${effectiveTier} plan allows a maximum of ${limits.maxVenues} venues. Upgrade to Pro for more.`
        }, { status: 403 })
      }
    }

    // Destructure courts from body — do NOT spread remaining fields into Prisma
    const { courts: courtsData, ...venueData } = body

    // Use explicit allowlist to prevent mass assignment
    const safeData: Record<string, unknown> = {}
    for (const field of VENUE_ALLOWED_FIELDS) {
      if (venueData[field] !== undefined) {
        safeData[field] = venueData[field]
      }
    }

    // Ensure JSON fields are not double-encoded
    const safeStringify = (val: unknown): string => {
      if (typeof val === 'string') {
        try { return JSON.stringify(JSON.parse(val)) }
        catch { return JSON.stringify([val]) }
      }
      return JSON.stringify(val || [])
    }

    safeData.images = safeStringify(safeData.images)
    safeData.amenities = safeStringify(safeData.amenities)
    safeData.sports = safeStringify(safeData.sports)
    safeData.ownerId = session.userId

    const venue = await db.venue.create({ data: safeData as any })

    // Create courts if provided
    if (Array.isArray(courtsData) && courtsData.length > 0) {
      for (const court of courtsData) {
        await db.court.create({
          data: {
            name: court.name,
            sport: court.sport,
            surface: court.surface || 'artificial_turf',
            isIndoor: court.isIndoor || false,
            pricePerHour: Number(court.pricePerHour) || 0,
            venueId: venue.id,
          }
        })
      }
    }

    return NextResponse.json(venue, { status: 201 })
  } catch (error) {
    console.error('[Venues] POST error:', error)
    return NextResponse.json({ error: 'Failed to create venue' }, { status: 500 })
  }
}
