import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { calculatePrice } from '@/lib/pricing'
import { logAudit } from '@/lib/audit'

// POST — Owner creates a walk-in booking (auto-confirmed, no pending flow)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    if (session.role !== 'venue_owner' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Only venue owners and admins can create walk-in bookings' }, { status: 403 })
    }

    const body = await request.json()
    const { courtId, date, startTime, endTime, customerName, totalPrice, notes } = body

    if (!courtId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'courtId, date, startTime, endTime are required' }, { status: 400 })
    }

    // Validate date/time formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM' }, { status: 400 })
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
    }

    if (typeof totalPrice !== 'number' || totalPrice <= 0) {
      return NextResponse.json({ error: 'Total price must be a positive number' }, { status: 400 })
    }

    // ── Atomic: verify court + check conflicts + create booking in a transaction ──
    const result = await db.$transaction(async (tx) => {
      // Verify the court belongs to a venue owned by this owner
      const court = await tx.court.findUnique({
        where: { id: courtId },
        include: { venue: true }
      })

      if (!court) throw new Error('Court not found')
      if (court.venue.ownerId !== session.userId && session.role !== 'admin') {
        throw new Error('You do not own this court')
      }

      // Check for time conflicts within the transaction
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

      if (conflicting) throw new Error('This slot is already booked')

      // Walk-in: 0% platform commission
      const finalPrice = totalPrice

      // Create booking — auto-confirmed
      const booking = await tx.booking.create({
        data: {
          date,
          startTime,
          endTime,
          status: 'confirmed',
          totalPrice: finalPrice,
          effectivePrice: finalPrice,
          platformFee: 0,
          isWalkIn: true,
          confirmedBy: session.userId,
          confirmedAt: new Date(),
          notes: customerName ? `Walk-in: ${customerName}${notes ? `. ${notes}` : ''}` : notes || null,
          courtId,
        }
      })

      // Create payment record (cash, completed)
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: finalPrice,
          method: 'cash',
          status: 'completed'
        }
      })

      return { booking, court }
    })

    // Audit log outside transaction (non-critical, don't fail the booking if it fails)
    try {
      await logAudit({
        entityType: 'booking',
        entityId: result.booking.id,
        action: 'created_walkin',
        actorId: session.userId,
        actorRole: session.role,
        newValue: {
          courtId, date, startTime, endTime,
          totalPrice: result.booking.totalPrice,
          isWalkIn: true,
          customerName: customerName || null,
        }
      })
    } catch (e) {
      console.error('[Walk-in] Audit log failed (non-fatal):', e)
    }

    return NextResponse.json(result.booking)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create walk-in booking'
    const status = ['Court not found', 'You do not own this court', 'This slot is already booked'].includes(message)
      ? (message.includes('not found') ? 404 : message.includes('own') ? 403 : 409)
      : 500
    console.error('[Walk-in] POST error:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
