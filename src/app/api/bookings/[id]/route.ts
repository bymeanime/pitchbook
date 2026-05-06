import { db } from '@/lib/db'
import { parseSessionToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit, checkRedFlags } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = parseSessionToken(token)
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        court: { include: { venue: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        payments: true
      }
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Authorization: only booking member, venue owner, or admin can view
    const isMember = booking.members.some(m => m.userId === session.userId)
    const isOwner = booking.court.venue.ownerId === session.userId
    if (!isMember && !isOwner && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    const isMember = await db.bookingMember.findFirst({ where: { bookingId: id, userId: session.userId } })
    const isOwner = booking.court.venue.ownerId === session.userId
    const isAdmin = session.role === 'admin'

    // ── CONFIRM ──
    // Only venue owner or admin can confirm
    if (body.status === 'confirmed') {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Only venue owner or admin can confirm bookings' }, { status: 403 })
      }
      if (booking.status !== 'pending') {
        return NextResponse.json({ error: `Cannot confirm a booking that is ${booking.status}` }, { status: 400 })
      }

      const updated = await db.booking.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmedBy: session.userId,
          confirmedAt: new Date(),
        }
      })

      // Payment stays 'pending' — customer pays cash at venue.
      // Payment will be marked 'completed' when owner marks booking as 'completed'.

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'status_changed', actorId: session.userId, actorRole: session.role,
        oldValue: { status: booking.status },
        newValue: { status: 'confirmed' },
        metadata: { confirmedBy: session.userId }
      })

      return NextResponse.json(updated)
    }

    // ── REJECT ──
    // Only venue owner or admin can reject
    if (body.status === 'rejected') {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Only venue owner or admin can reject bookings' }, { status: 403 })
      }
      if (booking.status !== 'pending') {
        return NextResponse.json({ error: `Cannot reject a booking that is ${booking.status}` }, { status: 400 })
      }

      const updated = await db.booking.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectedBy: session.userId,
          rejectedAt: new Date(),
          rejectionReason: body.reason || null,
        }
      })

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'status_changed', actorId: session.userId, actorRole: session.role,
        oldValue: { status: booking.status },
        newValue: { status: 'rejected', reason: body.reason },
      })
      await checkRedFlags({
        entityType: 'booking', entityId: id,
        action: 'rejected', actorId: session.userId
      })

      return NextResponse.json(updated)
    }

    // ── CANCEL ──
    // Booking member (player) can cancel pending/confirmed bookings
    // Owner/admin can cancel any booking
    if (body.status === 'cancelled') {
      if (!isMember && !isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return NextResponse.json({ error: `Cannot cancel a booking that is ${booking.status}` }, { status: 400 })
      }

      const updated = await db.booking.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledBy: session.userId,
          cancelledAt: new Date(),
          cancellationReason: body.reason || null,
        }
      })

      // Update payment status
      await db.payment.updateMany({
        where: { bookingId: id },
        data: { status: 'refunded' }
      })

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'status_changed', actorId: session.userId, actorRole: session.role,
        oldValue: { status: booking.status },
        newValue: { status: 'cancelled', reason: body.reason },
      })
      await checkRedFlags({
        entityType: 'booking', entityId: id,
        action: 'cancelled', actorId: session.userId
      })

      return NextResponse.json(updated)
    }

    // ── COMPLETE ──
    // Owner/admin can mark a confirmed booking as completed (after the session)
    if (body.status === 'completed') {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Only venue owner or admin can complete bookings' }, { status: 403 })
      }
      if (booking.status !== 'confirmed') {
        return NextResponse.json({ error: `Cannot complete a booking that is ${booking.status}` }, { status: 400 })
      }

      const updated = await db.booking.update({
        where: { id },
        data: { status: 'completed' }
      })

      // Mark payment as completed (customer paid at venue after session)
      await db.payment.updateMany({
        where: { bookingId: id },
        data: { status: 'completed' }
      })

      // Update booking member status to paid
      await db.bookingMember.updateMany({
        where: { bookingId: id },
        data: { status: 'paid' }
      })

      await logAudit({
        entityType: 'booking', entityId: id,
        action: 'status_changed', actorId: session.userId, actorRole: session.role,
        oldValue: { status: booking.status },
        newValue: { status: 'completed' },
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
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

    // Only admin can hard-delete bookings
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Only admin can delete bookings. Use cancel instead.' }, { status: 403 })
    }

    const booking = await db.booking.findUnique({
      where: { id },
      include: { members: true },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    await db.payment.deleteMany({ where: { bookingId: id } })
    await db.bookingMember.deleteMany({ where: { bookingId: id } })
    await db.booking.delete({ where: { id } })

    return NextResponse.json({ message: 'Booking deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
