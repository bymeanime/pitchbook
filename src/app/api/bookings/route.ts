import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { calculatePrice } from '@/lib/pricing'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    // Get user's bookings
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

    const bookings = members.map(m => ({
      ...m.booking,
      userStatus: m.status,
      userAmount: m.amount
    }))

    return NextResponse.json(bookings)
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

    const { courtId, date, startTime, endTime, notes, memberEmails } = body

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

    // Validate date is today or in the future
    const bookingDate = new Date(date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (bookingDate < today) {
      return NextResponse.json({ error: 'Booking date must be today or in the future' }, { status: 400 })
    }

    // Verify court exists and get price
    const court = await db.court.findUnique({
      where: { id: courtId },
      include: { venue: true }
    })

    if (!court) return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    if (!court.venue.isOpen) return NextResponse.json({ error: 'Venue is currently closed' }, { status: 400 })

    // Check for conflicting bookings
    const conflicting = await db.booking.findFirst({
      where: {
        courtId,
        date,
        status: { in: ['pending', 'confirmed'] },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } }
        ]
      }
    })

    if (conflicting) {
      return NextResponse.json({ error: 'This time slot is already booked' }, { status: 409 })
    }

    // ── Dynamic pricing calculation ──
    const priceResult = await calculatePrice({
      courtId,
      venueId: court.venueId,
      date,
      startTime,
      endTime,
    })

    const effectivePrice = priceResult.effectivePrice
    const platformFee = Math.round(effectivePrice * (court.venue.commission / 100))
    const totalPrice = effectivePrice

    // ── Create booking as PENDING (owner must confirm) ──
    // No prepayment — default is cash/pay-at-venue
    const booking = await db.booking.create({
      data: {
        courtId,
        date,
        startTime,
        endTime,
        totalPrice,
        effectivePrice,
        platformFee,
        notes: notes || null,
        status: 'pending', // Owner confirmation required
        isWalkIn: false,
      }
    })

    // Add booker as primary member
    await db.bookingMember.create({
      data: {
        userId: session.userId,
        bookingId: booking.id,
        amount: totalPrice,
        status: 'pending', // Payment pending (pay at venue)
      }
    })

    // Create payment record — cash/pending (no prepayment in Nepal)
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: totalPrice,
        method: 'cash',
        status: 'pending', // Will be marked completed when paid at venue
      }
    })

    return NextResponse.json({
      ...booking,
      court,
      venue: court.venue,
      pricing: priceResult,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
