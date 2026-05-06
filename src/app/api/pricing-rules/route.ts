import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveTier, checkTrialExpiry } from '@/lib/subscription'

// GET /api/pricing-rules?venueId=xxx&courtId=xxx
// List all pricing rules for a venue (owner/admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venueId')
    const courtId = searchParams.get('courtId')

    if (!venueId) {
      return NextResponse.json({ error: 'venueId is required' }, { status: 400 })
    }

    // Authorization: only venue owner or admin
    const venue = await db.venue.findUnique({ where: { id: venueId } })
    if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    if (venue.ownerId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const where: any = { venueId, isActive: true }
    if (courtId) where.courtId = courtId
    // If no courtId, also include venue-wide rules (courtId = null)
    if (!courtId) {
      where.OR = [
        { courtId: null },
        { courtId: { not: null } }
      ]
      delete where.courtId
    }

    const rules = await db.pricingRule.findMany({
      where,
      include: {
        court: { select: { id: true, name: true, sport: true } }
      },
      orderBy: { priority: 'desc' },
    })

    return NextResponse.json(rules)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/pricing-rules
// Create a new pricing rule (venue owner/admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    if (!['venue_owner', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Only venue owners and admins can manage pricing rules' }, { status: 403 })
    }

    const {
      venueId, courtId, name,
      date, dayOfWeek, startTime, endTime,
      validFrom, validUntil,
      flatPrice, priceMultiplier, priority
    } = body

    if (!venueId) return NextResponse.json({ error: 'venueId is required' }, { status: 400 })

    // Verify ownership
    const venue = await db.venue.findUnique({ where: { id: venueId } })
    if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    if (venue.ownerId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Subscription tier check: dynamic pricing requires Pro+ ──
    let subscription = await db.subscription.findUnique({ where: { userId: venue.ownerId } })
    if (subscription?.status === 'trial') {
      const expired = checkTrialExpiry(subscription.status, subscription.trialEndsAt)
      if (expired) subscription = await db.subscription.update({ where: { id: subscription.id }, data: { status: 'expired' } })
    }
    const effectiveTier = getEffectiveTier(subscription?.tier as any, subscription?.status as any, subscription?.trialEndsAt)
    if (effectiveTier === 'free') {
      return NextResponse.json({
        error: 'Dynamic pricing is available on Pro and Enterprise plans. Start a free trial or upgrade.'
      }, { status: 403 })
    }

    // Verify court belongs to venue if courtId provided
    if (courtId) {
      const court = await db.court.findFirst({ where: { id: courtId, venueId } })
      if (!court) return NextResponse.json({ error: 'Court not found in this venue' }, { status: 404 })
    }

    // Must have at least one trigger condition OR be an always-on rule
    const hasCondition = date || dayOfWeek !== undefined || startTime || endTime
    if (!hasCondition && !flatPrice) {
      return NextResponse.json({
        error: 'At least one trigger condition (date, dayOfWeek, startTime, endTime) or a flatPrice is required'
      }, { status: 400 })
    }

    // Must have exactly one price effect
    if (flatPrice !== undefined && flatPrice !== null && priceMultiplier && priceMultiplier !== 1.0) {
      return NextResponse.json({ error: 'Use either flatPrice or priceMultiplier, not both' }, { status: 400 })
    }

    const rule = await db.pricingRule.create({
      data: {
        venueId,
        courtId: courtId || null,
        name: name || null,
        date: date || null,
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
        startTime: startTime || null,
        endTime: endTime || null,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        flatPrice: flatPrice !== undefined && flatPrice !== null ? flatPrice : null,
        priceMultiplier: priceMultiplier || 1.0,
        priority: priority || 0,
      }
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/pricing-rules?id=xxx
// Update a pricing rule
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const ruleId = body.id
    if (!ruleId) return NextResponse.json({ error: 'Rule id is required' }, { status: 400 })

    const existing = await db.pricingRule.findUnique({
      where: { id: ruleId },
      include: { venue: true }
    })

    if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    if (existing.venue.ownerId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, date, dayOfWeek, startTime, endTime, validFrom, validUntil, flatPrice, priceMultiplier, priority, isActive } = body

    const updated = await db.pricingRule.update({
      where: { id: ruleId },
      data: {
        ...(name !== undefined && { name }),
        ...(date !== undefined && { date }),
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(validFrom !== undefined && { validFrom }),
        ...(validUntil !== undefined && { validUntil }),
        ...(flatPrice !== undefined && { flatPrice: flatPrice ?? null }),
        ...(priceMultiplier !== undefined && { priceMultiplier }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/pricing-rules?id=xxx
// Soft-delete (deactivate) a pricing rule
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('id')
    if (!ruleId) return NextResponse.json({ error: 'Rule id is required' }, { status: 400 })

    const existing = await db.pricingRule.findUnique({
      where: { id: ruleId },
      include: { venue: true }
    })

    if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    if (existing.venue.ownerId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete — deactivate the rule
    await db.pricingRule.update({
      where: { id: ruleId },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Pricing rule deactivated' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
