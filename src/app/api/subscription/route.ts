import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getEffectiveTier, checkTrialExpiry, TIER_LIMITS, TIER_PRICING, TRIAL_DURATION_DAYS } from '@/lib/subscription'
import { logAudit } from '@/lib/audit'

// GET — Get current user's subscription with usage info
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    let subscription = await db.subscription.findUnique({
      where: { userId: session.userId }
    })

    // Lazy trial expiry check
    if (subscription?.status === 'trial') {
      const expired = checkTrialExpiry(subscription.status, subscription.trialEndsAt)
      if (expired) {
        subscription = await db.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired' }
        })
      }
    }

    const effectiveTier = getEffectiveTier(
      subscription?.tier as any,
      subscription?.status as any,
      subscription?.trialEndsAt
    )

    // Count usage
    const venueCount = await db.venue.count({
      where: { ownerId: session.userId }
    })

    const now = new Date()
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const bookingsThisMonth = await db.booking.count({
      where: {
        court: { venue: { ownerId: session.userId } },
        date: { gte: firstOfMonth },
        status: { in: ['pending', 'confirmed', 'completed'] }
      }
    })

    const limits = TIER_LIMITS[effectiveTier]
    const pricing = TIER_PRICING[effectiveTier]

    return NextResponse.json({
      subscription: subscription || { tier: 'free', status: 'active' },
      effectiveTier,
      usage: {
        venueCount,
        maxVenues: limits.maxVenues === Infinity ? null : limits.maxVenues,
        bookingsThisMonth,
        maxBookingsThisMonth: limits.maxBookingsPerMonth === Infinity ? null : limits.maxBookingsPerMonth,
      },
      features: {
        dynamicPricing: limits.dynamicPricing,
        fullAnalytics: limits.fullAnalytics,
        customBranding: limits.customBranding,
        prioritySupport: limits.prioritySupport,
      },
      pricing: { monthlyNPR: pricing.monthlyNPR, label: pricing.label },
      trial: {
        canStart: !subscription || (subscription.tier === 'free' && !subscription.trialStartsAt),
        durationDays: TRIAL_DURATION_DAYS,
        trialEndsAt: subscription?.trialEndsAt || null,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — Start free trial (venue_owner only)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    if (session.role !== 'venue_owner') {
      return NextResponse.json({ error: 'Only venue owners can start a trial' }, { status: 403 })
    }

    const existing = await db.subscription.findUnique({
      where: { userId: session.userId }
    })

    if (existing?.trialStartsAt) {
      return NextResponse.json({ error: 'Trial already used. Contact support to upgrade.' }, { status: 400 })
    }
    if (existing && existing.tier !== 'free') {
      return NextResponse.json({ error: 'You already have an active paid subscription.' }, { status: 400 })
    }

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS)

    const subscription = await db.subscription.upsert({
      where: { userId: session.userId },
      update: {
        tier: 'pro',
        status: 'trial',
        trialStartsAt: new Date(),
        trialEndsAt: trialEnd,
      },
      create: {
        userId: session.userId,
        tier: 'pro',
        status: 'trial',
        trialStartsAt: new Date(),
        trialEndsAt: trialEnd,
      }
    })

    await logAudit({
      entityType: 'subscription',
      entityId: subscription.id,
      action: 'trial_started',
      actorId: session.userId,
      actorRole: session.role,
      newValue: { tier: 'pro', status: 'trial', trialEndsAt: trialEnd.toISOString() }
    })

    return NextResponse.json({
      message: `Trial started! You have ${TRIAL_DURATION_DAYS} days of Pro features.`,
      subscription
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
