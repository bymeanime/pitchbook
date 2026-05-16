import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { calculatePrice } from '@/lib/pricing'
import { getEffectiveTier, TIER_LIMITS } from '@/lib/subscription'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    // Get user's bookings (deduplicated by booking ID)
    const members = await db.bookingMember.findMany({
      where: { userId: session.userId },
      include: {
        booking: {
          include: {
            court: {
              include: { venue: { select: { id: true, name: true, address: true, city: true } } }
            },
            members: { include: { user: { select: { id: true, name: true, email: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Deduplicate: if user is member of same booking multiple times, only show once
    const seen = new Set<string>()
    const bookings = members
      .filter(m => {
        if (seen.has(m.bookingId)) return false
        seen.add(m.bookingId)
        return true
      })
      .map(m => ({
        ...m.booking,
        userStatus: m.status,
        userAmount: m.amount
      }))

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('[Bookings] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { courtId, date, startTime, endTime, notes } = body

    // Validate required fields
    if (!courtId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields: courtId, date, startTime, endTime' }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM' }, { status: 400 })
    }

    // Validate startTime < endTime
    if (startTime >= endTime) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
    }

    // Validate date is today or in the future (Nepal timezone: UTC+5:45)
    const bookingDate = new Date(date + 'T00:00:00+05:45')
    const now = new Date()
    const todayNepal = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }))
    todayNepal.setHours(0, 0, 0, 0)
    if (bookingDate < todayNepal) {
      return NextResponse.json({ error: 'Booking date must be today or in the future' }, { status: 400 })
    }

    // Validate booking duration (min 30 min, max 4 hours)
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1])
    const durationMinutes = endMinutes - startMinutes
    if (durationMinutes < 30) {
      return NextResponse.json({ error: 'Minimum booking duration is 30 minutes' }, { status: 400 })
    }
    if (durationMinutes > 240) {
      return NextResponse.json({ error: 'Maximum booking duration is 4 hours' }, { status: 400 })
    }

    // ── Atomic: verify court + check conflicts + create booking in a transaction ──
    const result = await db.$transaction(async (tx) => {
      // Verify court exists and venue is open
      const court = await tx.court.findUnique({
        where: { id: courtId },
        include: { venue: true }
      })

      if (!court) throw new Error('Court not found')
      if (!court.venue.isOpen) throw new Error('Venue is currently closed')

      // Check for conflicting bookings within the transaction
      const conflicting = await tx.booking.findFirst({
        where: {
          courtId,
          date,
          status: { in: ['pending', 'confirmed'] },
          OR: [
            { startTime: { lt: endTime }, endTime: { gt: startTime } }
          ]
        }
      })

      if (conflicting) throw new Error('This time slot is already booked')

      // Validate time slot is within venue operating hours
      const bookingDayOfWeek = new Date(date + 'T12:00:00+05:45').getUTCDay()
      const activeSlot = await tx.timeSlot.findFirst({
        where: {
          courtId,
          dayOfWeek: bookingDayOfWeek,
          startTime: { lte: startTime },
          endTime: { gte: endTime },
          isActive: true,
        }
      })
      if (!activeSlot) {
        throw new Error('Selected time is outside venue operating hours')
      }

      // Check subscription tier for venue owner
      const ownerSub = await tx.subscription.findUnique({ where: { userId: court.venue.ownerId } })
      const ownerTier = getEffectiveTier(
        ownerSub?.tier as any, 
        ownerSub?.status as any, 
        ownerSub?.trialEndsAt
      )
      const ownerLimits = TIER_LIMITS[ownerTier]
      if (ownerLimits.maxBookingsPerMonth !== Infinity) {
        const firstOfMonth = new Date(date + 'T00:00:00+05:45')
        firstOfMonth.setDate(1)
        const monthEnd = new Date(firstOfMonth)
        monthEnd.setMonth(monthEnd.getMonth() + 1)
        const monthlyCount = await tx.booking.count({
          where: {
            court: { venue: { ownerId: court.venue.ownerId } },
            date: { gte: firstOfMonth.toISOString().split('T')[0], lt: monthEnd.toISOString().split('T')[0] },
            status: { in: ['pending', 'confirmed', 'completed'] }
          }
        })
        if (monthlyCount >= ownerLimits.maxBookingsPerMonth) {
          throw new Error('This venue has reached its monthly booking limit. Ask the owner to upgrade their plan.')
        }
      }

      // Dynamic pricing calculation
      const priceResult = await calculatePrice({
        courtId,
        venueId: court.venueId,
        date,
        startTime,
        endTime,
      })

      // Calculate total price: per-hour rate x duration
      const hours = durationMinutes / 60
      const effectivePrice = Math.round(priceResult.effectivePrice * hours)
      const platformFee = Math.round(effectivePrice * ((court.venue.commission ?? 8) / 100))
      const totalPrice = effectivePrice

      // Create booking as PENDING (owner must confirm)
      const booking = await tx.booking.create({
        data: {
          courtId,
          date,
          startTime,
          endTime,
          totalPrice,
          effectivePrice,
          platformFee,
          notes: notes || null,
          status: 'pending',
          isWalkIn: false,
        }
      })

      // Add booker as primary member
      await tx.bookingMember.create({
        data: {
          userId: session.userId,
          bookingId: booking.id,
          amount: totalPrice,
          status: 'pending',
        }
      })

      // Create payment record — cash/pending
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalPrice,
          method: 'cash',
          status: 'pending',
        }
      })

      return { booking, court, priceResult }
    })

    return NextResponse.json({
      ...result.booking,
      court: result.court,
      venue: result.court.venue,
      pricing: result.priceResult,
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create booking'
    // Return 400 for known validation errors, 500 for unknown
    const status = ['Court not found', 'Venue is currently closed', 'This time slot is already booked'].includes(message)
      ? (message.includes('not found') ? 404 : message.includes('booked') ? 409 : 400)
      : 500
    console.error('[Bookings] POST error:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
