import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = parseSessionToken(token)
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

    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { courtId, date, startTime, endTime, notes, memberEmails } = body

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

    // Calculate price
    const platformFee = Math.round(court.pricePerHour * (court.venue.commission / 100))
    const totalPrice = court.pricePerHour

    // Create booking
    const booking = await db.booking.create({
      data: {
        courtId,
        date,
        startTime,
        endTime,
        totalPrice,
        platformFee,
        notes: notes || null,
        status: 'confirmed'
      }
    })

    // Add booker as primary member
    await db.bookingMember.create({
      data: {
        userId: session.userId,
        bookingId: booking.id,
        amount: totalPrice,
        status: 'paid'
      }
    })

    // Create payment record
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: totalPrice,
        method: 'card',
        status: 'completed'
      }
    })

    return NextResponse.json({
      ...booking,
      court,
      venue: court.venue
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
