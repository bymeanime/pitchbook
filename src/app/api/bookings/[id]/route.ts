import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        court: { include: { venue: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        payments: true
      }
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json(booking)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const booking = await db.booking.findUnique({
      where: { id },
      include: { court: { include: { venue: true } } }
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Only booking member, venue owner, or admin can update
    const isMember = await db.bookingMember.findFirst({ where: { bookingId: id, userId: session.userId } })
    if (!isMember && booking.court.venue.ownerId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await db.booking.update({
      where: { id },
      data: { status: body.status ?? booking.status }
    })

    // If cancelled, update payment
    if (body.status === 'cancelled') {
      await db.payment.updateMany({
        where: { bookingId: id },
        data: { status: 'refunded' }
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    await db.payment.deleteMany({ where: { bookingId: id } })
    await db.bookingMember.deleteMany({ where: { bookingId: id } })
    await db.booking.delete({ where: { id } })

    return NextResponse.json({ message: 'Booking deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
