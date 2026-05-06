import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { calculatePrice } from '@/lib/pricing'
import { logAudit } from '@/lib/audit'

// POST — Owner creates a walk-in booking (auto-confirmed, no pending flow)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    if (session.role !== 'venue_owner' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Only venue owners and admins can create walk-in bookings' }, { status: 403 })
    }

    const body = await request.json()
    const { courtId, date, startTime, endTime, customerName, totalPrice, notes } = body

    if (!courtId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'courtId, date, startTime, endTime are required' }, { status: 400 })
    }

    // Verify the court belongs to a venue owned by this owner
    const court = await db.court.findUnique({
      where: { id: courtId },
      include: { venue: true }
    })

    if (!court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 })
    }

    if (court.venue.ownerId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'You do not own this court' }, { status: 403 })
    }

    // Check for time conflicts (same as regular booking)
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
      return NextResponse.json({ error: 'This slot is already booked', status: 409 })
    }

    // Calculate reference price via dynamic pricing (owner can override)
    let effectivePrice = totalPrice
    if (!effectivePrice) {
      const pricing = await calculatePrice({ courtId, venueId: court.venueId, date, startTime, endTime })
      effectivePrice = pricing.effectivePrice
    }

    // Walk-in: 0% platform commission
    const platformFee = 0
    const finalPrice = totalPrice || effectivePrice

    // Create booking — auto-confirmed, no pending flow
    const booking = await db.booking.create({
      data: {
        date,
        startTime,
        endTime,
        status: 'confirmed',
        totalPrice: finalPrice,
        effectivePrice: finalPrice,
        platformFee,
        isWalkIn: true,
        confirmedBy: session.userId,
        confirmedAt: new Date(),
        notes: customerName ? `Walk-in: ${customerName}${notes ? `. ${notes}` : ''}` : notes || null,
        courtId,
      }
    })

    // Create payment record (cash, completed)
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: finalPrice,
        method: 'cash',
        status: 'completed'
      }
    })

    // No BookingMember — walk-in customer has no account

    await logAudit({
      entityType: 'booking',
      entityId: booking.id,
      action: 'created_walkin',
      actorId: session.userId,
      actorRole: session.role,
      newValue: {
        courtId, date, startTime, endTime,
        totalPrice: finalPrice,
        isWalkIn: true,
        customerName: customerName || null,
      }
    })

    return NextResponse.json(booking)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
